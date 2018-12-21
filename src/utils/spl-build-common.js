// @flow

"use babel";
"use strict";

import * as path from "path";
import * as fs from "fs";
import * as _ from "underscore";

import { Observable, of, empty, forkJoin, interval } from "rxjs";
import { switchMap, map, expand, filter, tap, debounceTime, mergeMap, takeUntil } from "rxjs/operators";
import * as ncp from "copy-paste";

const request = require("request");
request.defaults({jar: true});

const defaultIgnoreFiles = [
	".git",
	".project",
	".classpath",
	"toolkit.xml",
	".build*zip",
	"___bundle.zip"
];

const defaultIgnoreDirectories = [
	"output",
	"doc",
	"samples",
	"opt/client",
	".settings",
	".apt_generated",
	".build*",
	"___bundle"
];

const buildConsoleUrl = (url, instanceId) => `${url}#application/dashboard/Application%20Dashboard?instance=${instanceId}`;

const ibmCloudDashboardUrl = "https://cloud.ibm.com/resources?groups=resource-instance";

export class SplBuilder {
	static BUILD_ACTION = {DOWNLOAD: 0, SUBMIT: 1};
	static SPL_MSG_REGEX = /^([\w.]+\/[\w.]+)\:(\d+)\:(\d+)\:\s+(\w{5}\d{4}[IWE])\s+((ERROR|WARN|INFO)\:.*)$/;
	static SPL_NAMESPACE_REGEX = /^\s*(?:\bnamespace\b)\s+([a-z|A-Z|0-9|\.|\_]+)\s*\;/gm;
	static SPL_MAIN_COMPOSITE_REGEX = /.*?(?:\bcomposite\b)(?:\s*|\/\/.*?|\/\*.*?\*\/)+([a-z|A-Z|0-9|\.|\_]+)(?:\s*|\/\/.*?|\/\*.*?\*\/)*\{/gm;
	static STATUS_POLL_FREQUENCY = 5000;
	_pollHandleMessage = 0;

	structure = null;
	messageHandler = null;
	lintHandler = null;
	openUrlHandler = null;
	serviceCredentials = null;
	accessToken = null;
	originatorString = null;

	constructor(structure, messageHandler, lintHandler, openUrlHandler, originator) {
		this.structure = structure;
		this.messageHandler = messageHandler;
		this.lintHandler = lintHandler;
		this.openUrlHandler = openUrlHandler;
		this.originatorString = originator ? `${originator.originator}-${originator.version}:${originator.type}` : "";
	}

	dispose() {
	}

	/**
	 *  @param appRoot		path to the root of the application to be built
	 *  @param toolkitRootPath	path to directory with toolkits to include in archive
	 *	@param options		.useMakefile : true = use makefile to build, false = use fqn and generate a makefile for it
	 *										.makefilePath : path to makefile
	 *										.fqn : fully qualified main composite name to build. ignored if useMakefile == true
	 *
	 */
	async buildSourceArchive(appRoot, toolkitRootPath, options = {useMakefile: false}) {
		const archiver = require("archiver");

		this.useMakefile = options.useMakefile;
		if (options.makefilePath) {
			this.makefilePath = options.makefilePath;
		}
		if (options.fqn) {
			this.fqn = options.fqn;
		}

		const appRootContents = fs.readdirSync(appRoot);
		const makefilesFound = appRootContents.filter(entry => typeof(entry) === "string" && entry.toLowerCase() === "makefile");

		const buildTarget = options.useMakefile ? " with Makefile" : ` for ${options.fqn}`;
		this.messageHandler.handleInfo(`Building application archive${buildTarget}...`, { structure: this.structure });

		// temporary build archive filename is of format
		// .build_[fqn].zip or .build_make_[parent_dir].zip for makefile build
		// eg: .build_sample.Vwap.zip , .build_make_Vwap.zip
		const outputFilePath = `${appRoot}${path.sep}.build_${options.useMakefile ? "make_"+appRoot.split(path.sep).pop() : options.fqn.replace("::",".")}.zip`;

		// delete existing build archive file before creating new one
		// TODO: handle if file is open better (windows file locks)
		try {
			if (fs.existsSync(outputFilePath)) {
				fs.unlinkSync(outputFilePath);
			}

			const output = fs.createWriteStream(outputFilePath);
			const archive = archiver("zip", {
				zlib: { level: 9} // compression level
			});
			//const self = this;
			output.on("close", () => {
				console.log("Application source archive built");
				this.messageHandler.handleInfo("Application archive created, submitting to build service...", { structure: this.structure });
			});
			archive.on("warning", function(err) {
				if (err.code === "ENOENT") {
				} else {
					throw err;
				}
			});
			archive.on("error", function(err) {
				throw err;
			});
			archive.pipe(output);

			let makefilePath = "";

			const toolkitPaths = SplBuilder.getToolkits(toolkitRootPath);
			let tkPathString = "";
			if (toolkitPaths) {
				const rootContents = fs.readdirSync(appRoot);
				const newRoot = path.basename(appRoot);
				let ignoreFiles = defaultIgnoreFiles;

				// if building for specific main composite, ignore makefile
				if (!options.useMakefile) {
					ignoreFiles = ignoreFiles.concat(makefilesFound);
				}
				const ignoreDirs = defaultIgnoreDirectories.map(entry => `${entry}`);
				// Add files
				rootContents
					.filter(item => fs.lstatSync(`${appRoot}/${item}`).isFile())
					.filter(item => !_.some(ignoreFiles, name => {
						if (name.includes("*")) {
							const regex = new RegExp(name.replace(".","\.").replace("*",".*"));
							return regex.test(item);
						} else {
							return item.includes(name);
						}
					}))
					.forEach(item => archive.append(fs.readFileSync(`${appRoot}/${item}`), { name: `${newRoot}/${item}` }));

				// Add directories
				rootContents
					.filter(item => fs.lstatSync(`${appRoot}/${item}`).isDirectory())
					.filter(item => !_.some(ignoreDirs, name => {
						if (name.includes("*")) {
							const regex = new RegExp(name.replace(".","\.").replace("*",".*"));
							return regex.test(item);
						} else {
							return item.includes(name);
						}
					}))
					.forEach(item => archive.directory(`${appRoot}/${item}`, `${newRoot}/${item}`));

				toolkitPaths.forEach(tk => archive.directory(tk.tkPath, `toolkits/${tk.tk}`));
				tkPathString = `:../toolkits`;
				makefilePath = `${newRoot}/`;

				// Call the real Makefile
				let newCommand = `main:\n\tmake -C ${newRoot}`;
				archive.append(newCommand, { name: `Makefile` });

			} else {
				let ignoreList = defaultIgnoreFiles.concat(defaultIgnoreDirectories).map(entry => `${entry}/**`);
				if (!options.useMakefile) {
					ignoreList = ignoreList.concat(makefilesFound);
				}
				archive.glob("**/*", {
					cwd: `${appRoot}/`,
					ignore: ignoreList
				});
			}

			// if building specific main composite, generate a makefile
			if (options.fqn) {
				const makeCmd = `main:\n\tsc -M ${options.fqn} -t $$STREAMS_INSTALL/toolkits${tkPathString}`;
				archive.append(makeCmd, {name: `${makefilePath}/Makefile`});
			}

			const archiveStream = await archive.finalize();
		} catch (err) {
			this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, consoleErrorLog: false, structure: this.structure});
			return Promise.reject(err);
		}

		return outputFilePath;
	}

	build(action, streamingAnalyticsCredentials, input) {

		console.log("submitting application to build service");
		this.serviceCredentials = SplBuilder.parseServiceCredentials(streamingAnalyticsCredentials);
		if (this.serviceCredentials.apikey && this.serviceCredentials.v2_rest_url) {
			if (SplBuilder.BUILD_ACTION.DOWNLOAD === action) {
				this.buildAndDownloadBundle(input);
			} else if (SplBuilder.BUILD_ACTION.SUBMIT === action) {
				this.buildAndSubmitJob(input);
			}
		} else {
			const errorNotification = this.messageHandler.handleError("Unable to determine Streaming Analytics service credentials.", { structure: this.structure });
			this.messageHandler.handleCredentialsMissing(errorNotification);
			throw new Error("Error parsing VCAP_SERVICES environment variable");
		}
	}

	buildAndDownloadBundle(input) {
		const submitSourceAndWaitForBuild = this.submitSource(input).pipe(
			switchMap(submitSourceBody => this.pollBuildStatus(submitSourceBody)),
			map(buildStatusResult => ({...buildStatusResult, ...input})),
		);

		submitSourceAndWaitForBuild.pipe(
			filter(a => a && a.status === "built"),
			mergeMap(statusOutput => this.downloadBundlesObservable(statusOutput).pipe(
				map(downloadOutput => ( [ statusOutput, downloadOutput ]))
			)),
			mergeMap(downloadResult => this.performBundleDownloads(downloadResult, input)),
		).subscribe(
			next => {},
			err => {
				let errorNotification = null;
				if (err instanceof Error) {
					errorNotification = this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
				} else {
					errorNotification = this.messageHandler.handleError(err, { structure: this.structure });
				}
				this.checkKnownErrors(err, errorNotification, this.buildAndDownloadBundle.bind(this), input);
			},
			complete => {
				console.log("buildAndDownloadBundle observable complete");
				try {
					if (input.filename && fs.existsSync(input.filename)) {
						fs.unlinkSync(input.filename);
					}
				} catch (err) {
					this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
				}
			}
		);
	}

	buildAndSubmitJob(input) {
		const outputDir = `${path.dirname(input.filename)}${path.sep}output`;
		const submitSourceAndWaitForBuild = this.submitSource(input).pipe(
			switchMap(submitSourceBody => this.pollBuildStatus(submitSourceBody)),
			map(buildStatusResult => ({...buildStatusResult, ...input})),
		);

		submitSourceAndWaitForBuild.pipe(
			filter(a => a && a.status === "built"),
			switchMap(artifacts => this.getConsoleUrlObservable().pipe(
				map(consoleResponse => [ artifacts, consoleResponse ]),
				map(consoleResult => {
					const [ artifacts, consoleResponse ] = consoleResult;
					if (consoleResponse.body["streams_console"] && consoleResponse.body["id"]) {
						const consoleUrl = buildConsoleUrl(consoleResponse.body["streams_console"], consoleResponse.body["id"]);

						this.submitJobPrompt(consoleUrl, outputDir, this.submitAppObservable.bind(this), artifacts);

					} else {
						this.messageHandler.handleError("Cannot retrieve Streaming Analytics Console URL", { structure: this.structure });
					}
				})
			)),
		).subscribe(
			next => {},
			err => {
				let errorNotification = null;
				if (err instanceof Error) {
					errorNotification = this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
				} else {
					errorNotification = this.messageHandler.handleError(err, { structure: this.structure });
				}
				this.checkKnownErrors(err, errorNotification, this.buildAndSubmitJob.bind(this), input);
			},
			complete => {
				console.log("buildAndSubmitJob observable complete");
				try {
					if (input.filename && fs.existsSync(input.filename)) {
						fs.unlinkSync(input.filename);
					}
				} catch (err) {
					this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
				}
			}
		);
	}

	submit(streamingAnalyticsCredentials, input) {
		console.log("submit(); input:",arguments);
		this.serviceCredentials = SplBuilder.parseServiceCredentials(streamingAnalyticsCredentials);
		const self = this;
		if (this.serviceCredentials.apikey && this.serviceCredentials.v2_rest_url) {
			const outputDir = path.dirname(input.filename);

			this.getAccessTokenObservable().pipe(
				map(accessTokenResponse => {
					this.accessToken = accessTokenResponse.body.access_token;
					return input;
				}),
				switchMap(submitInput => this.getConsoleUrlObservable().pipe(
					map(consoleResponse => [ submitInput, consoleResponse ]),
					map(consoleResult => {
						const [ submitInput, consoleResponse ] = consoleResult;
						if (consoleResponse.body["streams_console"] && consoleResponse.body["id"]) {
							const consoleUrl = buildConsoleUrl(consoleResponse.body["streams_console"], consoleResponse.body["id"]);

							this.submitJobPrompt(consoleUrl, outputDir, this.submitSabObservable.bind(this), input);

						} else {
							this.messageHandler.handleError("Cannot retrieve Streaming Analytics Console URL", { structure: this.structure });
						}
					})
				)),

			).subscribe(
				next => {},
				err => {
					let errorNotification = null;
					if (err instanceof Error) {
						errorNotification = this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
					} else {
						errorNotification = this.messageHandler.handleError(err, { structure: this.structure });
					}
					this.checkKnownErrors(err, errorNotification, this.submit.bind(this), [streamingAnalyticsCredentials, input]);
				},
				complete => console.log("submit .sab observable complete"),
			);
		} else {
			const errorNotification = this.messageHandler.handleError("Unable to determine Streaming Analytics service credentials.", { structure: this.structure });
			this.messageHandler.handleCredentialsMissing(errorNotification);
			throw new Error("Error parsing VCAP_SERVICES environment variable");
		}
	}

	openStreamingAnalyticsConsole(streamingAnalyticsCredentials) {
		this.serviceCredentials = SplBuilder.parseServiceCredentials(streamingAnalyticsCredentials);
		if (this.serviceCredentials.apikey && this.serviceCredentials.v2_rest_url) {
			this.getAccessTokenObservable().pipe(
				mergeMap(response => {
					this.accessToken = response.body.access_token;
					return this.getConsoleUrlObservable();
				}),
				map(response => {
					if (response.body["streams_console"] && response.body["id"]) {
						const consoleUrl = buildConsoleUrl(response.body["streams_console"], response.body["id"]);
						this.openUrlHandler(consoleUrl);
					} else {
						this.messageHandler.handleError("Cannot retrieve Streaming Analytics Console URL", { structure: this.structure });
					}
				})
			).subscribe(
				next => {},
				err => {
					let errorNotification = null;
					if (err instanceof Error) {
						errorNotification = this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
					} else {
						errorNotification = this.messageHandler.handleError(err, { structure: this.structure });
					}
					this.checkKnownErrors(err);
				},
				complete => {
					console.log("open Console URL observable complete");
				}
			);
		}
	}

	openCloudDashboard() {
		this.openUrlHandler(ibmCloudDashboardUrl);
	}

	submitJobPrompt(consoleUrl, outputDir, submissionObservableFunc, submissionObservableInput) {
		console.log("submitJobPrompt(); input:",arguments);
		let submissionTarget = "the application(s)";
		if (typeof(this.useMakefile) === "boolean") {
			 if(this.useMakefile) {
				 submissionTarget = "the application(s) for the Makefile";
			 } else if (this.fqn) {
				 submissionTarget = this.fqn;
			 }
		} else {
			if (submissionObservableInput.filename) {
				submissionTarget = submissionObservableInput.filename.split(path.sep).pop();
			}
		}

		// Submission notification
		let submissionNotification = null;
		const dialogMessage = `Job submission - ${this.useMakefile ? this.makefilePath : submissionTarget}`;
		const dialogDetail = `Submit ${submissionTarget} to your service with default configuration ` +
			"or use the Streaming Analytics Console to customize the submission-time configuration.";

		const dialogButtons = [
			{
				label: "Submit",
				callbackFn: () => {
					console.log("submitButtonCallback");
					this.messageHandler.handleInfo("Submitting application to Streaming Analytics service...", { structure: this.structure });
					submissionObservableFunc(submissionObservableInput).pipe(
						mergeMap(submitResult => {

							const notificationButtons = [
								{
									label: "Open Streaming Analytics Console",
									callbackFn: () => this.openUrlHandler(consoleUrl)
								}
							];
							// when build+submit from makefile/spl file, potentially multiple objects coming back
							if (Array.isArray(submitResult)) {
								submitResult.forEach(obj => {
									if (obj.body) {
										this.messageHandler.handleSuccess(`Job ${obj.body.name} is ${obj.body.health}`, {notificationButtons: notificationButtons, structure: this.structure});
									}
								});
							} else {
								if (submitResult.body) {
									this.messageHandler.handleSuccess(`Job ${submitResult.body.name} is ${submitResult.body.health}`, {notificationButtons: notificationButtons, structure: this.structure});
								}
							}
							return of(submitResult);
						})
					).subscribe(
						next => {},
						err => {
							let errorNotification = null;
							if (err instanceof Error) {
								errorNotification = this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
							} else {
								errorNotification = this.messageHandler.handleError(err, { structure: this.structure });
							}
							console.log("submitPrompt error caught, submissionObservableFunc:",submissionObservableFunc, "submissionObservableInput:",submissionObservableInput);
							this.checkKnownErrors(err, errorNotification, this.submitJobPrompt.bind(this), [consoleUrl, outputDir, submissionObservableFunc, submissionObservableInput]);
						},
						complete => console.log("job submission observable complete"),
					);
					this.messageHandler.dismissNotification(submissionNotification);
				}
			},
			{
				label: "Submit via Streaming Analytics Console",
				callbackFn: () => {

					if (submissionObservableInput.filename && submissionObservableInput.filename.toLowerCase().endsWith(".sab")) {
						// sab is local already
						this.openUrlHandler(consoleUrl);

					} else {
						// need to download bundles first
						this.messageHandler.handleInfo("Downloading application bundles for submission via Streaming Analytics Console...", { structure: this.structure });
						this.downloadBundlesObservable(submissionObservableInput).pipe(
							map(downloadOutput => ( [ submissionObservableInput, downloadOutput ])),
							mergeMap(downloadResult => this.performBundleDownloads(downloadResult, null, outputDir)),
						).subscribe(
							next => {},
							err => {
								let errorNotification = null;
								if (err instanceof Error) {
									errorNotification = this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
								} else {
									errorNotification = this.messageHandler.handleError(err, { structure: this.structure });
								}
								this.checkKnownErrors(err, errorNotification);
							},
							complete => this.openUrlHandler(consoleUrl)
						);
					}
					this.messageHandler.dismissNotification(submissionNotification);
				}
			},
		];

		submissionNotification = this.messageHandler.handleInfo(dialogMessage,{detail: dialogDetail, notificationAutoDismiss: false, notificationButtons: dialogButtons, structure: this.structure});
	}


	/**
	 *	poll build status for a specific build
	 *	@param input
	 */
	pollBuildStatus(input) {
		let prevBuildOutput = [];
		let buildMessage = `Building ${this.useMakefile? this.makefilePath : this.fqn}...`;
		this.messageHandler.handleInfo(buildMessage, { structure: this.structure });
		return this.getBuildStatusObservable(input)
			.pipe(
				map((buildStatusResponse) => ({...input, ...buildStatusResponse.body})),
				expand(buildStatusCombined =>
					!this.buildStatusIsComplete(buildStatusCombined, prevBuildOutput)
						? this.getBuildStatusObservable(buildStatusCombined).pipe(
							debounceTime(SplBuilder.STATUS_POLL_FREQUENCY),
							map(innerBuildStatusResponse => ({...buildStatusCombined, ...innerBuildStatusResponse.body})),
							tap(s => {
								if (this._pollHandleMessage % 3 === 0) {
									const newOutput = this.getNewBuildOutput(s.output, prevBuildOutput);
									this.messageHandler.handleInfo(buildMessage, {detail: this.messageHandler.getLoggableMessage(newOutput), structure: this.structure});
									prevBuildOutput = s.output;
								}
								this._pollHandleMessage++;
							})
						)
						: empty()
				),
			);
	}

	getNewBuildOutput(currOutput, prevOutput) {
		return Array.isArray(currOutput) && Array.isArray(prevOutput) && currOutput.length > prevOutput.length
			? currOutput.slice(-(currOutput.length - prevOutput.length))
			: [];
	}

	submitSource(input) {
		return this.getAccessTokenObservable().pipe(
		map(accessTokenResponse => {
			this.accessToken = accessTokenResponse.body.access_token;
			return input;
		}),
		switchMap(submitSourceInput => this.submitSourceBundleObservable(submitSourceInput)
			.pipe(
			map((submitSourceResponse)=> ({...submitSourceInput,id: submitSourceResponse.body.id, output_id: submitSourceResponse.body.output_id}))
			))
		);
	}

	buildStatusIsComplete(input, prevBuildOutput) {
		if (input.status === "failed") {
			const failMessage = `Build failed - ${this.useMakefile ? this.makefilePath : this.fqn}`;
			this.lintHandler.lint(input);
			const newOutput = this.getNewBuildOutput(input.output, prevBuildOutput);
			this.messageHandler.handleError(failMessage, {detail: this.messageHandler.getLoggableMessage(newOutput), structure: this.structure});
			return true;
		} else if (input.status === "built") {
			const successMessage = `Build succeeded - ${this.useMakefile ? this.makefilePath : this.fqn}`;
			this.lintHandler.lint(input);
			const newOutput = this.getNewBuildOutput(input.output, prevBuildOutput);
			this.messageHandler.handleSuccess(successMessage, {detail: this.messageHandler.getLoggableMessage(newOutput), structure: this.structure});
			return true;
		} else {
			return false;
		}
	}

	checkKnownErrors(err, errorNotification, retryCallbackFunction = null, retryInput = null) {
		if (typeof(err) === "string") {
			if (err.includes("CDISB4090E")) {
				// additional notification with button to open IBM Cloud dashboard so the user can verify their
				// service is started.
				const n = this.messageHandler.handleError(
					"Verify that the Streaming Analytics service is started and able to handle requests.",
					{ notificationButtons: [
						{
							label: "Open IBM Cloud Dashboard",
							callbackFn: ()=>{this.openUrlHandler(ibmCloudDashboardUrl)}
						},
						{
							label: "Start service and retry",
							callbackFn: ()=> this.startServiceAndRetry(retryCallbackFunction, retryInput, [errorNotification, n])
						}
					], structure: this.structure}
				);
			}
		}
	}

	startServiceAndRetry(retryCallbackFunction, retryInput, notifications) {
		if (Array.isArray(notifications)) {
			notifications.map(a => this.messageHandler.dismissNotification(a));
		}

		const startingNotification = this.messageHandler.handleInfo("Streaming Analytics service is starting...", {notificationAutoDismiss: false, structure: this.structure});
		let startSuccessNotification = null;
		let serviceState = null;
		const poll = interval(8000);

		poll.pipe(
			takeUntil(this.startServiceObservable().pipe(
				map(a => {
					if (a && a.body && a.body.state){
						serviceState = a.body.state
					}
				}))
			),
		).subscribe(
		next => {},
		err => {
			let errorNotification = null;
			if (err instanceof Error) {
				errorNotification = this.messageHandler.handleError(err.name, {detail: err.message, stack: err.stack, structure: this.structure});
			} else {
				errorNotification = this.messageHandler.handleError(err, { structure: this.structure });
			}
			this.checkKnownErrors(err, errorNotification, retryCallbackFunction, retryInput);
		},
		startServiceResult => {
			this.messageHandler.dismissNotification(startingNotification);
			if (serviceState === "STARTED") {
				console.log("serviceRestartedSuccess",arguments);
				console.log("retryCallbackFunction:",retryCallbackFunction);
				console.log("retryCallbackInput:",retryInput);
				this.messageHandler.handleSuccess("Streaming Analytics service started", {detail: "Service has been started. Retrying build service request...", structure: this.structure});
				if (typeof(retryCallbackFunction) === "function" && retryInput) {
					if (Array.isArray(retryInput)) {
						retryCallbackFunction.apply(this, retryInput);
					} else {
						retryCallbackFunction(retryInput);
					}
				}
			} else {
				this.messageHandler.handleError("Error starting service", { structure: this.structure });
			}
			console.log("startService observable complete");
		});
	}

	getAccessTokenObservable() {
		const iamTokenRequestOptions = {
			method: "POST",
			url: "https://iam.cloud.ibm.com/identity/token",
			json: true,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded"
			},
			form: {
				grant_type: "urn:ibm:params:oauth:grant-type:apikey",
				apikey: this.serviceCredentials.apikey
			}
		};
		return SplBuilder.createObservableRequest(iamTokenRequestOptions);
	}

	startServiceObservable() {
		console.log("startServiceObservable entry");
		const startServiceRequestOptions = {
			method: "PATCH",
			url: this.serviceCredentials.v2_rest_url,
			instance_id: `${this.serviceCredentials.v2_rest_url.split("/").pop()}`,
			json: true,
			headers: {
				"Authorization": `Bearer ${this.accessToken}`,
				"Content-Type": "application/json"
			},
			body: {
				"state": "STARTED"
			}
		};
		return SplBuilder.createObservableRequest(startServiceRequestOptions);
	}

	getBuildStatusObservable(input) {
		console.log("pollBuildStatusObservable input:", input);
		const buildStatusRequestOptions = {
			method: "GET",
			url: `${this.serviceCredentials.v2_rest_url}/builds/${input.id}`,
			qs: {
				output_id: input.output_id
			},
			json: true,
			headers: {
				"Authorization": `Bearer ${this.accessToken}`,
				"Content-Type": "application/json"
			},
		};
		return SplBuilder.createObservableRequest(buildStatusRequestOptions);
	}

	submitSourceBundleObservable(input) {
		console.log("submitSourceBundleObservable input:", input);
		var buildPostRequestOptions = {
			method: "POST",
			url: `${this.serviceCredentials.v2_rest_url}/builds`,
			json: true,
			qs: {
				originator: this.originatorString
			},
			headers: {
				"Authorization": `Bearer ${this.accessToken}`,
				"Content-Type": "application/json"
			},
			formData: {
				file: {
					value: fs.createReadStream(input.filename),
					options: {
						filename: input.filename.split(path.sep).pop(),
						contentType: "application/zip"
					}
				}
			}
		};
		return SplBuilder.createObservableRequest(buildPostRequestOptions);
	}

	downloadBundlesObservable(input) {
		console.log("downloadBundlesObservable input:", input);
		const observables = _.map(input.artifacts, artifact => {
			const downloadBundleRequestOptions = {
				method: "GET",
				url: `${artifact.download}`,
				encoding: null,
				resolveWithFullResponse: true,
				headers: {
					"Authorization": `Bearer ${this.accessToken}`,
					"Accept": "application/octet-stream",
					"filename": `${artifact.name}`
				}
			};
			console.log(downloadBundleRequestOptions);
			return SplBuilder.createObservableRequest(downloadBundleRequestOptions);
		});
		return forkJoin(observables);
	}

	getConsoleUrlObservable() {
		console.log("getConsoleUrlObservable");
		const getConsoleUrlRequestOptions = {
			method: "GET",
			url: `${this.serviceCredentials.v2_rest_url}`,
			json: true,
			encoding: null,
			headers: {
				"Authorization": `Bearer ${this.accessToken}`
			}
		};
		console.log(getConsoleUrlRequestOptions);
		return SplBuilder.createObservableRequest(getConsoleUrlRequestOptions);
	}

	submitSabObservable(input) {
		console.log("submitSabObservable", input);
		let jobConfig = "{}";
		const submitSabRequestOptions = {
			method: "POST",
			url: `${this.serviceCredentials.v2_rest_url}/jobs`,
			json: true,
			headers: {
				"Authorization": `Bearer ${this.accessToken}`,
			},
			formData: {
				job_options: {
					value: jobConfig,
					options: {
						contentType: "application/json"
					}
				},
				bundle_file: {
					value: fs.createReadStream(input.filename),
					options: {
						contentType: "application/octet-stream"
					}
				}
			}
		}
		console.log(submitSabRequestOptions);
		return SplBuilder.createObservableRequest(submitSabRequestOptions);
	}

	submitAppObservable(input) {
		console.log("submitAppObservable input:", input);
		const observables = _.map(input.artifacts, artifact => {
			let jobConfig = "{}";
			// TODO: Support for submitting job with job config overlay file
			// 	if (fs.existsSync(jobConfigFile)) {
			// 		jobConfig = fs.readFileSync(jobConfigFile, "utf8");
			// 	}
			// console.log("job config for submit:",jobConfig);

			const submitAppRequestOptions = {
				method: "POST",
				url: `${artifact.submit_job}`,
				json: true,
				qs: {
					artifact_id: artifact.id
				},
				headers: {
					"Authorization": `Bearer ${this.accessToken}`,
				},
				formData: {
					job_options: {
						value: jobConfig,
						options: {
							contentType: "application/json"
						}
					}
				}
			};
			console.log(submitAppRequestOptions);
			return SplBuilder.createObservableRequest(submitAppRequestOptions);
		});
		return forkJoin(observables);
	}

	performBundleDownloads(downloadResult, input, outputDirOverride = undefined) {
		const [ statusOutput, downloadOutput ] = downloadResult;
		const outputDir = outputDirOverride ? outputDirOverride : `${path.dirname(input.filename)}${path.sep}output`;
		try {
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir);
			}
		} catch (err) {
			throw new Error(`Error creating output directory\n${err}`);
		}

		const observables = _.map(statusOutput.artifacts, artifact => {
			const index = _.findIndex(statusOutput.artifacts, artifactObj => artifactObj.name === artifact.name);
			const outputFile = `${outputDir}${path.sep}${artifact.name}`;
			try {
				if (fs.existsSync(outputFile)) {
					fs.unlinkSync(outputFile);
				}
				fs.writeFileSync(outputFile, downloadOutput[index].body);
				const notificationButtons = [
					{
						label: "Copy output path",
						callbackFn: () => ncp.copy(outputDir)
					}
				];
				this.messageHandler.handleSuccess(
					`Application ${artifact.name} bundle downloaded to output directory`,
					{
						detail: outputFile,
						notificationButtons: notificationButtons,
						structure: this.structure
					}
				);
				return of(outputDir);
			} catch (err) {
				throw new Error(`Error downloading application .sab bundle\n${err}`);
			}
		});
		return forkJoin(observables);
	}

	static createObservableRequest(options) {
		return Observable.create((req) => {
			request(options, (err, resp, body) => {
				if (err) {
					req.error(err);
				} else if (body.errors && Array.isArray(body.errors)) {
					req.error(body.errors.map(err => err.message).join("\n"));
				} else {
					req.next({resp, body});
				}
				req.complete();
			});
		});
	}

	/**
	 *
	 */
	static getToolkits(toolkitRootDir) {
		let validToolkitPaths = null;
		if (toolkitRootDir && toolkitRootDir.trim() !==  "") {
			if (fs.existsSync(toolkitRootDir)) {
				let toolkitRootContents = fs.readdirSync(toolkitRootDir);
				validToolkitPaths = toolkitRootContents
					.filter(item => fs.lstatSync(`${toolkitRootDir}${path.sep}${item}`).isDirectory())
					.filter(dir => fs.readdirSync(`${toolkitRootDir}${path.sep}${dir}`).filter(tkDirItem => tkDirItem === "toolkit.xml").length > 0)
					.map(tk => ({ tk: tk, tkPath: `${toolkitRootDir}${path.sep}${tk}` }));
			}
		}
		return validToolkitPaths;
	}

	/**
	 * @param rootDirArray array of directories at the root of the IDE;
	 *											corresponds to atom.project.getPaths() in Atom,
	 *											or VSCode workspace.workspaceFolders
	 * @param filePath		 path to SPL file selected for build
	 */
	static getApplicationRoot(rootDirArray, filePath) {
		if (typeof(filePath) === "string" && Array.isArray(rootDirArray)) {
			let appDir = path.dirname(filePath);
			const notWorkspaceFolder = dir => (
				!_.some(rootDirArray, folder => folder === dir)
			);
			const noMatchingFiles = dir => !fs.existsSync(`${dir}${path.sep}info.xml`) && !fs.existsSync(`${dir}${path.sep}toolkit.xml`) && !fs.existsSync(`${dir}${path.sep}Makefile`) && !fs.existsSync(`${dir}${path.sep}makefile`);
			while (notWorkspaceFolder(appDir) && noMatchingFiles(appDir)) {
				appDir = path.resolve(`${appDir}${path.sep}..`);
			}
			return appDir;
		} else {
			throw new Error("Error getting application root path");
		}
	}


	/**
	 * read VCAP_SERVICES env variable, process the file it refers to.
	 * Expects VCAP JSON format,
	 * eg: {"streaming-analytics":[{"name":"service-1","credentials":{apikey:...,v2_rest_url:...}}]}
	 */
	static parseServiceCredentials(streamingAnalyticsCredentials) {
		const vcapServicesPath = process.env.VCAP_SERVICES;
		if (streamingAnalyticsCredentials && typeof(streamingAnalyticsCredentials) === "string") {
			let serviceCreds = JSON.parse(streamingAnalyticsCredentials);
			if (serviceCreds && serviceCreds.apikey && serviceCreds.v2_rest_url) {
				return serviceCreds;
			}
		} else if (vcapServicesPath && typeof(vcapServicesPath) === "string") {
			try {
				if (fs.existsSync(vcapServicesPath)) {
					let vcapServices = JSON.parse(fs.readFileSync(vcapServicesPath, "utf8"));
					if (vcapServices.apikey && vcapServices.v2_rest_url) {
						console.log("vcap:",vcapServices);
						return {apikey: vcapServices.apikey, v2_rest_url: vcapServices.v2_rest_url};
					}
					let streamingAnalytics = vcapServices["streaming-analytics"];
					if (streamingAnalytics && streamingAnalytics[0]) {
						let credentials = streamingAnalytics[0].credentials;
						if (credentials) {
							return {apikey: credentials.apikey, v2_rest_url: credentials.v2_rest_url};
						} else {
							console.log("Credentials not found in streaming-analytics service in VCAP");
						}
					} else {
						console.log("streaming-analytics service not found in VCAP");
					}
				} else {
					console.log("The VCAP file does not exist: " + vcapServicesPath);
				}
			} catch (error) {
				console.log("Error processing VCAP file: " + vcapServicesPath, error);
			}
		}
		return {};
	};

}
