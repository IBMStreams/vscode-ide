// @flow

"use babel";
"use strict";

import * as path from "path";
import * as fs from "fs";
import * as _ from "underscore";

import { Observable, of, empty, forkJoin } from "rxjs";
import { switchMap, map, expand, filter, tap, debounceTime, mergeMap } from "rxjs/operators";
import * as ncp from "copy-paste";

const request = require("request");
request.defaults({jar: true});

const defaultIgnoreFiles = [
	".git",
	".project",
	".classpath",
	"toolkit.xml",
	"___bundle.zip"
];

const defaultIgnoreDirectories = [
	"output",
	"doc",
	"samples",
	"opt/client",
	".settings",
	"___bundle"
];

export class SplBuilder {
	static BUILD_ACTION = {DOWNLOAD: 0, SUBMIT: 1};
	static SPL_MSG_REGEX = /^([\w.]+\/[\w.]+)\:(\d+)\:(\d+)\:\s+(\w{5}\d{4}[IWE])\s+((ERROR|WARN|INFO)\:.*)$/;
	static SPL_NAMESPACE_REGEX = /^\s*(?:\bnamespace\b)\s+([a-z|A-Z|0-9|\.|\_]+)\s*\;/gm;
	static SPL_MAIN_COMPOSITE_REGEX = /.*?(?:\bcomposite\b)(?:\s*|\/\/.*?|\/\*.*?\*\/)+([a-z|A-Z|0-9|\.|\_]+)(?:\s*|\/\/.*?|\/\*.*?\*\/)*\{/gm;
	static STATUS_POLL_FREQUENCY = 5000;
	_pollHandleMessage = 0;

	filePath = null;
	messageHandler = null;
	lintHandler = null;
	openUrlHandler = null;
	serviceCredentials = null;
	accessToken = null;
	originatorString = null;

	constructor(filePath, messageHandler, lintHandler, openUrlHandler, originator) {
		this.filePath = filePath;
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
	async buildSourceArchive(appRoot, toolkitRootPath, options) {
		const archiver = require("archiver");

		const appRootContents = fs.readdirSync(appRoot);
		const makefilesFound = appRootContents.filter(entry => typeof(entry) === "string" && entry.toLowerCase() === "makefile");

		const buildTarget = options.useMakefile ? " with Makefile" : ` for ${options.fqn}`;
		this.messageHandler.handleBuildProgressMessage(this.filePath, `Building application archive${buildTarget}...`, true);

		const outputFilePath = `${appRoot}${path.sep}___bundle.zip`;

		// delete existing ___bundle.zip file before creating new one
		// TODO: handle if file is open better (windows file locks)
		try {
			if (fs.existsSync(outputFilePath)) {
				fs.unlinkSync(outputFilePath);
			}

			const output = fs.createWriteStream(outputFilePath);
			const archive = archiver("zip", {
				zlib: { level: 9} // compression level
			});
			const self = this;
			output.on("close", function() {
				console.log("Application source archive built");
				self.messageHandler.handleBuildProgressMessage(self.filePath, "Application archive created, submitting to build service...", true);
			});
			// TODO: handle warnings/errors instead of throwing?
			archive.on("warning", function(err) {
				if (err.code === "ENOENT") {
					// log warning
				} else {
					// throw error
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
					.filter(item => !_.some(ignoreFiles, name => item.includes(name)))
					.forEach(item => archive.append(fs.readFileSync(`${appRoot}/${item}`), { name: `${newRoot}/${item}` }));

				// Add directories
				rootContents
					.filter(item => fs.lstatSync(`${appRoot}/${item}`).isDirectory())
					.filter(item => !_.some(ignoreDirs, name => item.endsWith(name)))
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
			this.messageHandler.handleError(this.filePath, err);
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
			this.messageHandler.handleError(this.filePath, "Unable to determine Streaming Analytics service credentials.");
			this.messageHandler.handleCredentialsMissing();
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
				console.log("build error\n", err);
				this.messageHandler.handleError(this.filePath, err);
				this.checkKnownErrors(err);
			},
			downloadResult => console.log("download result\n",downloadResult),
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
						const consoleUrl = `${consoleResponse.body["streams_console"]}#application/dashboard/Application%20Dashboard?instance=${consoleResponse.body["id"]}`;

						this.submitJobPrompt(input.buildPath, consoleUrl, outputDir, this.submitAppObservable.bind(this), artifacts);

					} else {
						this.messageHandler.handleError(this.filePath, "Cannot retrieve Streaming Analytics Console URL");
					}
				})
			)),
		).subscribe(
			next => {},
			err => {
				console.log("build and submit via Console error\n", err);
				this.messageHandler.handleError(this.filePath, err);
				this.checkKnownErrors(err);
			},
			consoleResult => console.log("submit via Console result\n", consoleResult),
		);
	}

	submit(streamingAnalyticsCredentials, input) {
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
							const consoleUrl = `${consoleResponse.body["streams_console"]}#application/dashboard/Application%20Dashboard?instance=${consoleResponse.body["id"]}`;

							this.submitJobPrompt(input.buildPath, consoleUrl, outputDir, this.submitSabObservable.bind(this), input);

						} else {
							this.messageHandler.handleError(this.filePath, "Cannot retrieve Streaming Analytics Console URL");
						}
					})
				)),

			).subscribe(
				next => {},
				err => {
					console.log("submit job error\n", err);
					this.messageHandler.handleError(this.filePath, err);
					this.checkKnownErrors(err);
				},
				consoleResult => console.log("submit result\n", consoleResult),
			);
		} else {
			this.messageHandler.handleError(this.filePath, "Unable to determine Streaming Analytics service credentials.");
			this.messageHandler.handleCredentialsMissing();
			throw new Error("Error parsing VCAP_SERVICES environment variable");
		}
	}

	submitJobPrompt(buildPath, consoleUrl, outputDir, submissionObservableFunc, submissionObservableInput) {

		// Submission dialog
		const dialogMessage = "Job submission";
		const dialogDetail = `${buildPath}\n\nSubmit the application(s) to your instance with the default configuration ` +
			"or use the Streaming Analytics Console to customize the submission-time configuration.";

		const dialogButtons = [
			{
				label: "Submit",
				callbackFn: () => {
					this.messageHandler.handleSubmitProgressMessage(this.filePath, "Submitting application to Streaming Analytics instance...");
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
										this.messageHandler.handleSubmitSuccess(this.filePath, obj.body, notificationButtons);
									}
								});
							} else {
								if (submitResult.body) {
									this.messageHandler.handleSubmitSuccess(this.filePath, submitResult.body, notificationButtons);
								}
							}
							return of(submitResult);
						})
					).subscribe(
						next => {},
						err => {
							console.log("default job submit error\n", err);
							this.messageHandler.handleError(this.filePath, err);
							this.checkKnownErrors(err);
						},
						consoleResult => console.log("submit result\n", consoleResult),
					);
				}
			},
			{
				label: "Submit via Console",
				callbackFn: () => {
					const submitMsg = () => {
						this.messageHandler.handleSuccess(
							this.filePath,
							"Submit via Console",
							`${buildPath}\n\nUse the Streaming Analytics Console to submit. Click on the play button in the header and select your application(s).`,
							true,
							true,
							[
								{
									label: "Copy output path",
									callbackFn: () => ncp.copy(outputDir)
								},
								{
									label: "Open Streaming Analytics Console",
									callbackFn: () => this.openUrlHandler(consoleUrl)
								}
							]
						);
					};

					if (submissionObservableInput.filename && submissionObservableInput.filename.toLowerCase().endsWith(".sab")) {
						// sab is local already
						submitMsg();

					} else {
						// need to download bundles first
						this.messageHandler.handleSubmitProgressMessage(this.filePath, "Downloading application bundles for submission via Streaming analytics Console...");
						this.downloadBundlesObservable(submissionObservableInput).pipe(
							map(downloadOutput => ( [ submissionObservableInput, downloadOutput ])),
							mergeMap(downloadResult => this.performBundleDownloads(downloadResult, null, outputDir)),
						).subscribe(
							next => {},
							err => {
								console.log("Error downloading bundles for Console submit\n", err);
								this.messageHandler.handleError(this.filePath, err);
								this.checkKnownErrors(err);
							},
							submitMsg(),
						);
					}
				}
			},
			{
				label: "Cancel",
				callbackFn: null
			}
		];

		this.messageHandler.showDialog(dialogMessage, dialogDetail, dialogButtons);
		this.messageHandler.handleBuildProgressMessage(this.filePath, `Streaming Analytics Console URL: ${consoleUrl}`);

	}


	/**
	 *	poll build status for a specific build
	 *	@param input
	 *  @param messageHandler	IDE specific message handler callback object
	 */
	pollBuildStatus(input) {
		let prevBuildOutput = [];
		this.messageHandler.handleBuildProgressMessage(this.filePath, "Building...", true);
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
									this.messageHandler.handleBuildProgressMessage(this.filePath, newOutput, true);
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
			this.lintHandler.lint(input);
			const newOutput = this.getNewBuildOutput(input.output, prevBuildOutput);
			this.messageHandler.handleBuildFailure(this.filePath, newOutput);
			return true;
		} else if (input.status === "built") {
			this.lintHandler.lint(input);
			const newOutput = this.getNewBuildOutput(input.output, prevBuildOutput);
			this.messageHandler.handleBuildSuccess(this.filePath, newOutput);
			return true;
		} else {
			return false;
		}
	}

	checkKnownErrors(err) {
		if (typeof(err) === "string") {
			if (err.includes("CDISB4090E")) {
				// additional notification with button to open bluemix dashboard so the user can verify their
				// service is started.
				this.messageHandler.handleError(
					this.filePath,
					"Verify that the Streaming Analytics service is started and able to handle requests.",
					[{label: "Open IBM Cloud Dashboard",
						callbackFn: ()=>{this.openUrlHandler("https://console.bluemix.net/dashboard/apps")}
					}]);
			}
		}
	}

	getAccessTokenObservable() {
		const iamTokenRequestOptions = {
			method: "POST",
			url: "https://iam.bluemix.net/identity/token",
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
						filename: "___bundle.zip",
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
				this.messageHandler.handleSuccess(this.filePath, `Application ${artifact.name} bundle downloaded to output directory`, outputFile, true, true);
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
