import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';

import {
  Observable, of, empty, forkJoin, interval
} from 'rxjs';
import {
  switchMap, map, expand, filter, tap, debounceTime, mergeMap, takeUntil
} from 'rxjs/operators';
import * as clipboardy from 'clipboardy';

const request = require('request');

request.defaults({ jar: true });

const buildConsoleUrl = (url, instanceId) => `${url}#application/dashboard/Application%20Dashboard?instance=${instanceId}`;

const ibmCloudDashboardUrl = 'https://cloud.ibm.com/resources?groups=resource-instance';

export class SplBuilder {
  static BUILD_ACTION = { DOWNLOAD: 0, SUBMIT: 1 };

  static SPL_MSG_REGEX = /^([\w.]+(?:\/[\w.]+)?):(\d+):(\d+):\s+(\w{5}\d{4}[IWE])\s+((ERROR|WARN|INFO):.*)$/;

  static SPL_NAMESPACE_REGEX = /^\s*(?:\bnamespace\b)\s+([a-z|A-Z|0-9|.|_]+)\s*;/gm;

  static SPL_MAIN_COMPOSITE_REGEX = /.*?(?:\bcomposite\b)(?:\s*|\/\/.*?|\/\*.*?\*\/)+([a-z|A-Z|0-9|.|_]+)(?:\s*|\/\/.*?|\/\*.*?\*\/)*\{/gm;

  static STATUS_POLL_FREQUENCY = 5000;

  _pollHandleMessage = 0;

  messageHandler = null;

  lintHandler = null;

  openUrlHandler = null;

  serviceCredentials = null;

  accessToken = null;

  originatorString = null;

  constructor(messageHandler, lintHandler, openUrlHandler, originator, identifier) {
    this.messageHandler = messageHandler;
    this.lintHandler = lintHandler;
    this.openUrlHandler = openUrlHandler;
    this.originatorString = originator ? `${originator.originator}-${originator.version}:${originator.type}` : '';
    if (identifier) {
      const { appRoot, fqn, makefilePath } = identifier;
      if (fqn) {
        this.useMakefile = false;
        this.fqn = fqn;
      }
      if (makefilePath) {
        this.useMakefile = true;
        this.makefilePath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, makefilePath)}`;
      }
    }
  }

  dispose() {
  }

  build(action, streamingAnalyticsCredentials, input) {
    console.log('submitting application to build service');
    this.serviceCredentials = SplBuilder.parseServiceCredentials(streamingAnalyticsCredentials);
    if (this.serviceCredentials.apikey && this.serviceCredentials.v2_rest_url) {
      if (SplBuilder.BUILD_ACTION.DOWNLOAD === action) {
        this.buildAndDownloadBundle(input);
      } else if (SplBuilder.BUILD_ACTION.SUBMIT === action) {
        this.buildAndSubmitJob(input);
      }
    } else {
      const errorNotification = this.messageHandler.handleError('Unable to determine Streaming Analytics service credentials.');
      this.messageHandler.handleCredentialsMissing(errorNotification);
      throw new Error('Error parsing VCAP_SERVICES environment variable');
    }
  }

  buildAndDownloadBundle(input) {
    const submitSourceAndWaitForBuild = this.submitSource(input).pipe(
      switchMap(submitSourceBody => this.pollBuildStatus(submitSourceBody)),
      map(buildStatusResult => ({ ...buildStatusResult, ...input }))
    );

    submitSourceAndWaitForBuild.pipe(
      filter(a => a && a.status === 'built'),
      mergeMap(statusOutput => this.downloadBundlesObservable(statusOutput).pipe(
        map(downloadOutput => ([statusOutput, downloadOutput]))
      )),
      mergeMap(downloadResult => this.performBundleDownloads(downloadResult, input))
    ).subscribe(
      next => { },
      err => {
        let errorNotification = null;
        if (err instanceof Error) {
          errorNotification = this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
        } else {
          errorNotification = this.messageHandler.handleError(err);
        }
        this.checkKnownErrors(err, errorNotification, this.buildAndDownloadBundle.bind(this), input);
      },
      complete => {
        console.log('buildAndDownloadBundle observable complete');
        try {
          if (input.filename && fs.existsSync(input.filename)) {
            fs.unlinkSync(input.filename);
          }
        } catch (err) {
          this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
        }
      }
    );
  }

  buildAndSubmitJob(input) {
    const outputDir = `${path.dirname(input.filename)}${path.sep}output`;
    const submitSourceAndWaitForBuild = this.submitSource(input).pipe(
      switchMap(submitSourceBody => this.pollBuildStatus(submitSourceBody)),
      map(buildStatusResult => ({ ...buildStatusResult, ...input }))
    );

    submitSourceAndWaitForBuild.pipe(
      filter(a => a && a.status === 'built'),
      switchMap(artifacts => this.getConsoleUrlObservable().pipe(
        map(consoleResponse => [artifacts, consoleResponse]),
        map(consoleResult => {
          const [submitArtifacts, consoleResponse] = consoleResult;
          if (consoleResponse.body.streams_console && consoleResponse.body.id) {
            const consoleUrl = buildConsoleUrl(consoleResponse.body.streams_console, consoleResponse.body.id);

            this.submitJobPrompt(consoleUrl, outputDir, this.submitAppObservable.bind(this), submitArtifacts);
          } else {
            this.messageHandler.handleError('Cannot retrieve Streaming Analytics Console URL');
          }
        })
      ))
    ).subscribe(
      next => { },
      err => {
        let errorNotification = null;
        if (err instanceof Error) {
          errorNotification = this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
        } else {
          errorNotification = this.messageHandler.handleError(err);
        }
        this.checkKnownErrors(err, errorNotification, this.buildAndSubmitJob.bind(this), input);
      },
      complete => {
        console.log('buildAndSubmitJob observable complete');
        try {
          if (input.filename && fs.existsSync(input.filename)) {
            fs.unlinkSync(input.filename);
          }
        } catch (err) {
          this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
        }
      }
    );
  }

  submit(streamingAnalyticsCredentials, input, ...args) {
    console.log('submit(); input:', args);
    this.serviceCredentials = SplBuilder.parseServiceCredentials(streamingAnalyticsCredentials);
    if (this.serviceCredentials.apikey && this.serviceCredentials.v2_rest_url) {
      const outputDir = path.dirname(input.filename);

      this.getAccessTokenObservable().pipe(
        map(accessTokenResponse => {
          this.accessToken = accessTokenResponse.body.access_token;
          return input;
        }),
        switchMap(submitInput => this.getConsoleUrlObservable().pipe(
          map(consoleResponse => [submitInput, consoleResponse]),
          map(consoleResult => {
            const [, consoleResponse] = consoleResult;
            if (consoleResponse.body.streams_console && consoleResponse.body.id) {
              const consoleUrl = buildConsoleUrl(consoleResponse.body.streams_console, consoleResponse.body.id);

              this.submitJobPrompt(consoleUrl, outputDir, this.submitSabObservable.bind(this), input);
            } else {
              this.messageHandler.handleError('Cannot retrieve Streaming Analytics Console URL');
            }
          })
        ))
      ).subscribe(
        next => { },
        err => {
          let errorNotification = null;
          if (err instanceof Error) {
            errorNotification = this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
          } else {
            errorNotification = this.messageHandler.handleError(err);
          }
          this.checkKnownErrors(err, errorNotification, this.submit.bind(this), [streamingAnalyticsCredentials, input]);
        },
        complete => console.log('submit .sab observable complete')
      );
    } else {
      const errorNotification = this.messageHandler.handleError('Unable to determine Streaming Analytics service credentials.');
      this.messageHandler.handleCredentialsMissing(errorNotification);
      throw new Error('Error parsing VCAP_SERVICES environment variable');
    }
  }

  submitJobPrompt(consoleUrl, outputDir, submissionObservableFunc, submissionObservableInput, ...args) {
    console.log('submitJobPrompt(); input:', args);
    let submissionTarget = 'the application(s)';
    if (typeof (this.useMakefile) === 'boolean') {
      if (this.useMakefile) {
        submissionTarget = 'the application(s) for the Makefile';
      } else if (this.fqn) {
        submissionTarget = this.fqn;
      }
    } else if (submissionObservableInput.filename) {
      submissionTarget = submissionObservableInput.filename.split(path.sep).pop();
    }

    // Submission notification
    let submissionNotification = null;
    const dialogMessage = `Job submission - ${this.useMakefile ? this.makefilePath : submissionTarget}`;
    const dialogDetail = `Submit ${submissionTarget} to your service with default configuration `
      + 'or use the Streaming Analytics Console to customize the submission time configuration.';

    const dialogButtons = [
      {
        label: 'Submit',
        callbackFn: () => {
          console.log('submitButtonCallback');
          submissionObservableFunc(submissionObservableInput).pipe(
            mergeMap(submitResult => {
              const notificationButtons = [
                {
                  label: 'Open Streaming Analytics Console',
                  callbackFn: () => this.openUrlHandler(consoleUrl)
                }
              ];
              // when build+submit from makefile/spl file, potentially multiple objects coming back
              if (Array.isArray(submitResult)) {
                submitResult.forEach(obj => {
                  if (obj.body) {
                    this.messageHandler.handleSuccess(`Job ${obj.body.name} is ${obj.body.health}`, { notificationButtons });
                  }
                });
              } else if (submitResult.body) {
                this.messageHandler.handleSuccess(`Job ${submitResult.body.name} is ${submitResult.body.health}`, { notificationButtons });
              }
              return of(submitResult);
            })
          ).subscribe(
            next => { },
            err => {
              let errorNotification = null;
              if (err instanceof Error) {
                errorNotification = this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
              } else {
                errorNotification = this.messageHandler.handleError(err);
              }
              console.log('submitPrompt error caught, submissionObservableFunc:', submissionObservableFunc, 'submissionObservableInput:', submissionObservableInput);
              this.checkKnownErrors(err, errorNotification, this.submitJobPrompt.bind(this), [consoleUrl, outputDir, submissionObservableFunc, submissionObservableInput]);
            },
            complete => console.log('job submission observable complete')
          );
          this.messageHandler.dismissNotification(submissionNotification);
        }
      },
      {
        label: 'Submit via Streaming Analytics Console',
        callbackFn: () => {
          if (submissionObservableInput.filename && submissionObservableInput.filename.toLowerCase().endsWith('.sab')) {
            // sab is local already
            this.openUrlHandler(consoleUrl);
          } else {
            // need to download bundles first
            this.messageHandler.handleInfo('Downloading application bundle(s) for submission via Streaming Analytics Console...');
            this.downloadBundlesObservable(submissionObservableInput).pipe(
              map(downloadOutput => ([submissionObservableInput, downloadOutput])),
              mergeMap(downloadResult => this.performBundleDownloads(downloadResult, null, outputDir))
            ).subscribe(
              next => { },
              err => {
                let errorNotification = null;
                if (err instanceof Error) {
                  errorNotification = this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
                } else {
                  errorNotification = this.messageHandler.handleError(err);
                }
                this.checkKnownErrors(err, errorNotification);
              },
              complete => this.openUrlHandler(consoleUrl)
            );
          }
          this.messageHandler.dismissNotification(submissionNotification);
        }
      }
    ];

    submissionNotification = this.messageHandler.handleInfo(dialogMessage, { detail: dialogDetail, notificationAutoDismiss: false, notificationButtons: dialogButtons });
  }

  /**
   *  poll build status for a specific build
   *  @param input
   */
  pollBuildStatus(input) {
    let prevBuildOutput = [];
    const buildMessage = `Building ${this.useMakefile ? this.makefilePath : this.fqn}...`;
    this.messageHandler.handleInfo(buildMessage);
    return this.getBuildStatusObservable(input)
      .pipe(
        map((buildStatusResponse) => ({ ...input, ...buildStatusResponse.body })),
        expand(buildStatusCombined => (!this.buildStatusIsComplete(buildStatusCombined, prevBuildOutput)
          ? this.getBuildStatusObservable(buildStatusCombined).pipe(
            debounceTime(SplBuilder.STATUS_POLL_FREQUENCY),
            map(innerBuildStatusResponse => ({ ...buildStatusCombined, ...innerBuildStatusResponse.body })),
            tap(s => {
              if (this._pollHandleMessage % 3 === 0) {
                const newOutput = this.getNewBuildOutput(s.output, prevBuildOutput);
                this.messageHandler.handleInfo(buildMessage, { detail: this.messageHandler.getLoggableMessage(newOutput) });
                prevBuildOutput = s.output;
              }
              this._pollHandleMessage += 1;
            })
          )
          : empty()))
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
          map((submitSourceResponse) => ({ ...submitSourceInput, id: submitSourceResponse.body.id, output_id: submitSourceResponse.body.output_id }))
        ))
    );
  }

  buildStatusIsComplete(input, prevBuildOutput) {
    if (input.status === 'failed') {
      const failMessage = `Build failed - ${this.useMakefile ? this.makefilePath : this.fqn}`;
      this.lintHandler.lint(input);
      const newOutput = this.getNewBuildOutput(input.output, prevBuildOutput);
      this.messageHandler.handleError(failMessage, { detail: this.messageHandler.getLoggableMessage(newOutput) });
      return true;
    }
    if (input.status === 'built') {
      const successMessage = `Build succeeded - ${this.useMakefile ? this.makefilePath : this.fqn}`;
      this.lintHandler.lint(input);
      const newOutput = this.getNewBuildOutput(input.output, prevBuildOutput);
      this.messageHandler.handleSuccess(successMessage, { detail: this.messageHandler.getLoggableMessage(newOutput) });
      return true;
    }
    return false;
  }

  checkKnownErrors(err, errorNotification, retryCallbackFunction = null, retryInput = null) {
    if (typeof (err) === 'string') {
      if (err.includes('CDISB4090E')) {
        // additional notification with button to open IBM Cloud dashboard so the user can verify their
        // service is started.
        const n = this.messageHandler.handleError(
          'Verify that the Streaming Analytics service is started and able to handle requests.',
          {
            notificationButtons: [
              {
                label: 'Open IBM Cloud Dashboard',
                callbackFn: () => { this.openUrlHandler(ibmCloudDashboardUrl); }
              },
              {
                label: 'Start service and retry',
                callbackFn: () => this.startServiceAndRetry(retryCallbackFunction, retryInput, [errorNotification, n])
              }
            ]
          }
        );
      }
    }
  }

  startServiceAndRetry(retryCallbackFunction, retryInput, notifications) {
    if (Array.isArray(notifications)) {
      notifications.map(a => this.messageHandler.dismissNotification(a));
    }

    const startingNotification = this.messageHandler.handleInfo('Streaming Analytics service is starting...', { notificationAutoDismiss: false });
    let serviceState = null;
    const poll = interval(8000);

    poll.pipe(
      takeUntil(this.startServiceObservable().pipe(
        map(a => {
          if (a && a.body && a.body.state) {
            serviceState = a.body.state;
          }
        })
      ))
    ).subscribe(
      next => { },
      err => {
        let errorNotification = null;
        if (err instanceof Error) {
          errorNotification = this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
        } else {
          errorNotification = this.messageHandler.handleError(err);
        }
        this.checkKnownErrors(err, errorNotification, retryCallbackFunction, retryInput);
      },
      (startServiceResult, ...args) => {
        this.messageHandler.dismissNotification(startingNotification);
        if (serviceState === 'STARTED') {
          console.log('serviceRestartedSuccess', args);
          console.log('retryCallbackFunction:', retryCallbackFunction);
          console.log('retryCallbackInput:', retryInput);
          this.messageHandler.handleSuccess('Streaming Analytics service started', { detail: 'Service has been started. Retrying Build Service request...' });
          if (typeof (retryCallbackFunction) === 'function' && retryInput) {
            if (Array.isArray(retryInput)) {
              retryCallbackFunction.apply(this, retryInput);
            } else {
              retryCallbackFunction(retryInput);
            }
          }
        } else {
          this.messageHandler.handleError('Error starting service');
        }
        console.log('startService observable complete');
      }
    );
  }

  openStreamingAnalyticsConsole(streamingAnalyticsCredentials, callback) {
    this.serviceCredentials = SplBuilder.parseServiceCredentials(streamingAnalyticsCredentials);
    if (this.serviceCredentials.apikey && this.serviceCredentials.v2_rest_url) {
      this.getAccessTokenObservable().pipe(
        mergeMap(response => {
          this.accessToken = response.body.access_token;
          return this.getConsoleUrlObservable();
        }),
        map(response => {
          if (response.body.streams_console && response.body.id) {
            const consoleUrl = buildConsoleUrl(response.body.streams_console, response.body.id);
            this.openUrlHandler(consoleUrl, callback(consoleUrl));
          } else {
            this.messageHandler.handleError('Cannot retrieve Streaming Analytics Console URL');
          }
        })
      ).subscribe(
        next => { },
        err => {
          if (err instanceof Error) {
            this.messageHandler.handleError(err.name, { detail: err.message, stack: err.stack });
          } else {
            this.messageHandler.handleError(err);
          }
          this.checkKnownErrors(err);
        },
        complete => {
          console.log('get Console URL observable complete');
        }
      );
    }
  }

  openCloudDashboard(callback) {
    this.openUrlHandler(ibmCloudDashboardUrl, callback(ibmCloudDashboardUrl));
  }

  getAccessTokenObservable() {
    const iamTokenRequestOptions = {
      method: 'POST',
      url: 'https://iam.cloud.ibm.com/identity/token',
      json: true,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: {
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: this.serviceCredentials.apikey
      }
    };
    return SplBuilder.createObservableRequest(iamTokenRequestOptions);
  }

  startServiceObservable() {
    console.log('startServiceObservable entry');
    const startServiceRequestOptions = {
      method: 'PATCH',
      url: this.serviceCredentials.v2_rest_url,
      instance_id: `${this.serviceCredentials.v2_rest_url.split('/').pop()}`,
      json: true,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        state: 'STARTED'
      }
    };
    return SplBuilder.createObservableRequest(startServiceRequestOptions);
  }

  getBuildStatusObservable(input) {
    console.log('pollBuildStatusObservable input:', input);
    const buildStatusRequestOptions = {
      method: 'GET',
      url: `${this.serviceCredentials.v2_rest_url}/builds/${input.id}`,
      qs: {
        output_id: input.output_id
      },
      json: true,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    return SplBuilder.createObservableRequest(buildStatusRequestOptions);
  }

  submitSourceBundleObservable(input) {
    console.log('submitSourceBundleObservable input:', input);
    const buildPostRequestOptions = {
      method: 'POST',
      url: `${this.serviceCredentials.v2_rest_url}/builds`,
      json: true,
      qs: {
        originator: this.originatorString
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      formData: {
        file: {
          value: fs.createReadStream(input.filename),
          options: {
            filename: input.filename.split(path.sep).pop(),
            contentType: 'application/zip'
          }
        }
      }
    };
    return SplBuilder.createObservableRequest(buildPostRequestOptions);
  }

  downloadBundlesObservable(input) {
    console.log('downloadBundlesObservable input:', input);
    const observables = _.map(input.artifacts, artifact => {
      const downloadBundleRequestOptions = {
        method: 'GET',
        url: `${artifact.download}`,
        encoding: null,
        resolveWithFullResponse: true,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/octet-stream',
          filename: `${artifact.name}`
        }
      };
      console.log(downloadBundleRequestOptions);
      return SplBuilder.createObservableRequest(downloadBundleRequestOptions);
    });
    return forkJoin(observables);
  }

  getConsoleUrlObservable() {
    console.log('getConsoleUrlObservable');
    const getConsoleUrlRequestOptions = {
      method: 'GET',
      url: `${this.serviceCredentials.v2_rest_url}`,
      json: true,
      encoding: null,
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    };
    console.log(getConsoleUrlRequestOptions);
    return SplBuilder.createObservableRequest(getConsoleUrlRequestOptions);
  }

  submitSabObservable(input) {
    console.log('submitSabObservable', input);
    const jobConfig = '{}';
    const submitSabRequestOptions = {
      method: 'POST',
      url: `${this.serviceCredentials.v2_rest_url}/jobs`,
      json: true,
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      },
      formData: {
        job_options: {
          value: jobConfig,
          options: {
            contentType: 'application/json'
          }
        },
        bundle_file: {
          value: fs.createReadStream(input.filename),
          options: {
            contentType: 'application/octet-stream'
          }
        }
      }
    };
    console.log(submitSabRequestOptions);
    return SplBuilder.createObservableRequest(submitSabRequestOptions);
  }

  submitAppObservable(input) {
    console.log('submitAppObservable input:', input);
    const observables = _.map(input.artifacts, artifact => {
      this.messageHandler.handleInfo(`Submitting application ${artifact.name} to the Streaming Analytics service...`);
      const jobConfig = '{}';
      // TODO: Support for submitting job with job config overlay file
      //  if (fs.existsSync(jobConfigFile)) {
      //    jobConfig = fs.readFileSync(jobConfigFile, "utf8");
      //  }
      // console.log("job config for submit:",jobConfig);

      const submitAppRequestOptions = {
        method: 'POST',
        url: `${artifact.submit_job}`,
        json: true,
        qs: {
          artifact_id: artifact.id
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        formData: {
          job_options: {
            value: jobConfig,
            options: {
              contentType: 'application/json'
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
    const [statusOutput, downloadOutput] = downloadResult;
    const outputDir = outputDirOverride || `${path.dirname(input.filename)}${path.sep}output`;
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
            label: 'Copy output path',
            callbackFn: () => clipboardy.writeSync(outputDir)
          }
        ];
        this.messageHandler.handleSuccess(
          `Application ${artifact.name} bundle downloaded to output directory`,
          {
            detail: outputFile,
            notificationButtons
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
          req.error(body.errors.map(error => error.message).join('\n'));
        } else {
          req.next({ resp, body });
        }
        req.complete();
      });
    });
  }

  static getToolkits(toolkitRootDir) {
    const validToolkitPaths = [];
    if (toolkitRootDir && toolkitRootDir.trim() !== '') {
      const toolkitRoots = [];

      if (toolkitRootDir.includes(',') || toolkitRootDir.includes(';')) {
        toolkitRoots.push(...toolkitRootDir.split(/[,;]/));
      } else {
        toolkitRoots.push(toolkitRootDir);
      }

      toolkitRoots.forEach(toolkitRoot => {
        if (fs.existsSync(toolkitRoot)) {
          const toolkitRootContents = fs.readdirSync(toolkitRoot);
          validToolkitPaths.push(...toolkitRootContents
            .filter(item => fs.lstatSync(`${toolkitRoot}${path.sep}${item}`).isDirectory())
            .filter(dir => fs.readdirSync(`${toolkitRoot}${path.sep}${dir}`).filter(tkDirItem => tkDirItem === 'toolkit.xml').length > 0)
            .map(tk => ({ tk, tkPath: `${toolkitRoot}${path.sep}${tk}` })));
        }
      });
    }
    return validToolkitPaths;
  }

  /**
   * @param rootDirArray  array of directories at the root of the IDE;
   *                      corresponds to atom.project.getPaths() in Atom,
   *                      or VSCode workspace.workspaceFolders
   * @param filePath      path to SPL file selected for build
   */
  static getApplicationRoot(rootDirArray, filePath) {
    if (typeof (filePath) === 'string' && Array.isArray(rootDirArray)) {
      let appDir = path.dirname(filePath);
      const notWorkspaceFolder = dir => (
        !_.some(rootDirArray, folder => folder === dir)
      );
      const noMatchingFiles = dir => !fs.existsSync(`${dir}${path.sep}info.xml`) && !fs.existsSync(`${dir}${path.sep}toolkit.xml`) && !fs.existsSync(`${dir}${path.sep}Makefile`) && !fs.existsSync(`${dir}${path.sep}makefile`);
      while (notWorkspaceFolder(appDir) && noMatchingFiles(appDir)) {
        appDir = path.resolve(`${appDir}${path.sep}..`);
      }
      return appDir;
    }
    throw new Error('Error getting application root path');
  }

  /**
   * read VCAP_SERVICES env variable, process the file it refers to.
   * Expects VCAP JSON format,
   * eg: {"streaming-analytics":[{"name":"service-1","credentials":{apikey:...,v2_rest_url:...}}]}
   */
  static parseServiceCredentials(streamingAnalyticsCredentials) {
    const vcapServicesPath = process.env.VCAP_SERVICES;
    if (streamingAnalyticsCredentials && typeof (streamingAnalyticsCredentials) === 'string') {
      const serviceCreds = JSON.parse(streamingAnalyticsCredentials);
      if (serviceCreds && serviceCreds.apikey && serviceCreds.v2_rest_url) {
        return serviceCreds;
      }
    } else if (vcapServicesPath && typeof (vcapServicesPath) === 'string') {
      try {
        if (fs.existsSync(vcapServicesPath)) {
          const vcapServices = JSON.parse(fs.readFileSync(vcapServicesPath, 'utf8'));
          if (vcapServices.apikey && vcapServices.v2_rest_url) {
            console.log('vcap:', vcapServices);
            return { apikey: vcapServices.apikey, v2_rest_url: vcapServices.v2_rest_url };
          }
          const streamingAnalytics = vcapServices['streaming-analytics'];
          if (streamingAnalytics && streamingAnalytics[0]) {
            const { credentials } = streamingAnalytics[0];
            if (credentials) {
              return { apikey: credentials.apikey, v2_rest_url: credentials.v2_rest_url };
            }
            console.log('Credentials not found in streaming-analytics service in VCAP');
          } else {
            console.log('streaming-analytics service not found in VCAP');
          }
        } else {
          console.log(`The VCAP file does not exist: ${vcapServicesPath}`);
        }
      } catch (error) {
        console.log(`Error processing VCAP file: ${vcapServicesPath}`, error);
      }
    }
    return {};
  }
}

export class SplBuildCommonV4 {
  static setTimeout(timeoutInSeconds) {
    request.defaults.timeout = timeoutInSeconds * 1000;
  }
}
