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

export class SplBuilder {
	static BUILD_ACTION = {DEFAULT: 0, DOWNLOAD: 1, SUBMIT: 2};
	static SPL_MSG_REGEX = /^([\w.]+\/[\w.]+)\:(\d+)\:(\d+)\:\s+(\w{5}\d{4}[IWE])\s+((ERROR|WARN|INFO)\:.*)$/;
	static SPL_NAMESPACE_REGEX = /^\s*(?:\bnamespace\b)\s+([a-z|A-Z|0-9|\.|\_]+)\s*\;/gm;
	static SPL_MAIN_COMPOSITE_REGEX = /.*?(?:\bcomposite\b)(?:\s*|\/\/.*?|\/\*.*?\*\/)+([a-z|A-Z|0-9|\.|\_]+)(?:\s*|\/\/.*?|\/\*.*?\*\/)*\{/gm;
	static STATUS_POLL_FREQUENCY = 5000;
	_pollHandleMessage = 0;

	messageHandler = null;
	lintHandler = null;
	openUrlHandler = null;
	serviceCredentials = null;
	accessToken = null;

	constructor(messageHandler, lintHandler, openUrlHandler) {
		this.messageHandler = messageHandler;
		this.lintHandler = lintHandler;
		this.openUrlHandler = openUrlHandler;
	}

	dispose() {
		messageHandler = null;
		lintHandler = null;
		serviceCredentials = null;
		accessToken = null;
	}

	async buildSourceArchive(appRoot, toolkitRootPath, fqn) {
		const archiver = require("archiver");

		const makefileExists = fs.existsSync(`${appRoot}/Makefile`) || fs.existsSync(`${appRoot}/makefile`);
		const buildTarget = makefileExists ? "" : ` for ${fqn}`;
		this.messageHandler.handleBuildProgressMessage(`Building application archive${buildTarget}...`, true);

		const outputFilePath = `${appRoot}/___bundle.zip`;

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
				console.log(archive.pointer() + " total bytes");
				console.log("Application source archive built");
				self.messageHandler.handleBuildProgressMessage("Application archive built, submitting to build service...", true);
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
				const ignoreFiles = [
					'.git',
					'.project',
					'.classpath',
					'___bundle.zip'
				];
				const ignoreDirs = [
					'output',
					'doc',
					'.settings',
					'___bundle'
				];
				// Add files
				rootContents
					.filter(item => fs.lstatSync(`${appRoot}/${item}`).isFile())
					.filter(item => !_.some(ignoreFiles, name => item.includes(name)))
					.forEach(item => archive.append(fs.readFileSync(`${appRoot}/${item}`), { name: `${newRoot}/${item}` }));

				// Add directories
				rootContents
					.filter(item => fs.lstatSync(`${appRoot}/${item}`).isDirectory())
					.filter(item => !_.some(ignoreDirs, name => item === name))
					.forEach(item => archive.directory(`${appRoot}/${item}`, `${newRoot}/${item}`));

				toolkitPaths.forEach(tk => archive.directory(tk.tkPath, `toolkits/${tk.tk}`));
				tkPathString = ":../toolkits";
				makefilePath = `${newRoot}/`;

				// Call the real Makefile
				let newCommand = `main:\n\tmake -C ${newRoot}`;
				archive.append(newCommand, { name: `Makefile` });

			} else {
				archive.glob("**/*", {
					cwd: `${appRoot}/`,
					ignore: [
						'output/**',
						'opt/client/**',
						'doc/**',
						'.git*',
						'___bundle.zip',
						'___bundle*/**'
					]
				});
			}

			// if there is no makefile in the project, add a basic makefile
			if (!fs.existsSync(`${appRoot}/Makefile`) && !fs.existsSync(`${appRoot}/makefile`)) {
				const makeCmd = `main:\n\tsc -M ${fqn} -t $$STREAMS_INSTALL/toolkits${tkPathString}`;
				archive.append(makeCmd, {name: `${makefilePath}Makefile`});
			}

			const archiveStream = await archive.finalize();
		} catch (err) {
			this.messageHandler.handleError(err);
			return Promise.reject(err);
		}

		return outputFilePath;
	}

	build(action, streamingAnalyticsCredentials, input) {

		console.log("submitting application to build service");
		this.serviceCredentials = SplBuilder.parseServiceCredentials(streamingAnalyticsCredentials);
		if (this.serviceCredentials.apikey && this.serviceCredentials.v2_rest_url) {
			if (SplBuilder.BUILD_ACTION.DEFAULT === action) {
				this.justBuild(input);
			} else if (SplBuilder.BUILD_ACTION.DOWNLOAD === action) {
				this.buildAndDownloadBundle(input);
			} else if (SplBuilder.BUILD_ACTION.SUBMIT === action) {
				this.buildAndSubmitJob(input);
			}
		} else {
			this.messageHandler.handleError("Error parsing VCAP_SERVICES environment variable");
			throw new Error("Error parsing VCAP_SERVICES environment variable");
		}
	}

	justBuild(input) {
		this.submitSource(input).pipe(
			tap(a => console.log("app source has been submitted...")),
			switchMap(submitSourceBody => this.pollBuildStatus(submitSourceBody)),
		).subscribe(
			next => {},
			err => {
				console.log("build error\n", err);
				this.messageHandler.handleError(err);
			},
			buildStatusResult => console.log("build status result\n", buildStatusResult),
		);
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
				this.messageHandler.handleError(err);
			},
			downloadResult => console.log("download result\n",downloadResult),
		);
	}

	buildAndSubmitJob(input) {
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
			switchMap(outputDir => this.getConsoleUrlObservable().pipe(
				map(consoleResponse => [ outputDir, consoleResponse ]),
				map(consoleResult => {
					const [ outputDirs, consoleResponse ] = consoleResult;
					outputDir = outputDir[0];
					if (consoleResponse.body['streams_console'] && consoleResponse.body['id']) {
						const consoleUrl = `${consoleResponse.body["streams_console"]}#application/dashboard/Application%20Dashboard?instance=${consoleResponse.body["id"]}`;
						this.openUrlHandler(consoleUrl);

						const dialogMessage = "Redirecting to your IBM Cloud Streaming Analytics service for job submission...";
						const dialogDetail = `To submit your job, open the "Submit Job" dialog by pressing on the play button in the header. Then, click on the "Browse" button and select a bundle in the following folder:\n\n${outputDir}\n\nFrom there, you may either configure the job submission or submit the job with the default configuration settings.\n\nIf you would like to submit multiple bundles, repeat as necessary.`;
						const dialogButtons = [
							{ label: "Copy output path to clipboard", callbackFn: () => ncp.copy(outputDir) },
							{ label: "Close", callbackFn: null }
						];
						this.messageHandler.showDialog(dialogMessage, dialogDetail, dialogButtons);

						this.messageHandler.handleBuildProgressMessage(dialogMessage, true);
						this.messageHandler.handleBuildProgressMessage(`Streaming Analytics Console URL: ${consoleUrl}`);
					} else {
						this.messageHandler.handleError("Cannot retrieve Streaming Analytics Console URL");
					}
				})
			)),
		).subscribe(
			next => {},
			err => {
				console.log("build error\n", err);
				this.messageHandler.handleError(err);
			},
			consoleResult => console.log("submit result\n", consoleResult),
		);
	}


	/**
	 *	poll build status for a specific build
	 *	@param input
	 *  @param messageHandler	IDE specific message handler callback object
	 */
	pollBuildStatus(input) {
		let prevBuildOutput = [];
		this.messageHandler.handleBuildProgressMessage("Building...", true);
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
									this.messageHandler.handleBuildProgressMessage(newOutput, true);
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
		return currOutput.length > prevOutput.length
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
			this.messageHandler.handleBuildFailure(newOutput);
			return true;
		} else if (input.status === "built") {
			this.lintHandler.lint(input);
			const newOutput = this.getNewBuildOutput(input.output, prevBuildOutput);
			this.messageHandler.handleBuildSuccess(newOutput);
			return true;
		} else {
			return false;
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
			method: 'POST',
			url: `${this.serviceCredentials.v2_rest_url}/builds`,
			json: true,
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			formData: {
				file: {
					value: fs.createReadStream(input.filename),
					options: {
						filename: '___bundle.zip',
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

	submitAppObservable(input) {
		console.log("submitAppObservable input:", input);
		const artifact = input.artifacts[0];
		let jobConfig = "{}";
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
	}

	performBundleDownloads(downloadResult, input) {
		const [ statusOutput, downloadOutput ] = downloadResult;
		const outputDir = `${path.dirname(input.filename)}/output`;
		try {
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir);
			}
		} catch (err) {
			throw new Error(`Error creating output directory\n${err}`);
		}

		const observables = _.map(statusOutput.artifacts, artifact => {
			const index = _.findIndex(statusOutput.artifacts, artifactObj => artifactObj.name === artifact.name);
			const outputFile = `${outputDir}/${artifact.name}`;
			try {
				if (fs.existsSync(outputFile)) {
					fs.unlinkSync(outputFile);
				}
				fs.writeFileSync(outputFile, downloadOutput[index].body);
				this.messageHandler.handleSuccess(`Application ${artifact.name} bundle downloaded to output directory`, outputFile, true, true);
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
		if (toolkitRootDir && toolkitRootDir.trim() !==  '') {
			if (fs.existsSync(toolkitRootDir)) {
				let toolkitRootContents = fs.readdirSync(toolkitRootDir);
				validToolkitPaths = toolkitRootContents
					.filter(item => fs.lstatSync(`${toolkitRootDir}/${item}`).isDirectory())
					.filter(dir => fs.readdirSync(`${toolkitRootDir}/${dir}`).filter(tkDirItem => tkDirItem === 'toolkit.xml').length > 0)
					.map(tk => ({ tk: tk, tkPath: `${toolkitRootDir}/${tk}` }));
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
			const noMatchingFiles = dir => !fs.existsSync(`${dir}/info.xml`) && !fs.existsSync(`${dir}/toolkit.xml`) && !fs.existsSync(`${dir}/Makefile`) && !fs.existsSync(`${dir}/makefile`);
			while (notWorkspaceFolder(appDir) && noMatchingFiles(appDir)) {
				appDir = path.resolve(`${appDir}/..`);
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
