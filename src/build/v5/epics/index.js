import { combineEpics, ofType } from 'redux-observable';
import * as path from 'path';
import * as fs from 'fs';
import {
  defaultIfEmpty,
  map,
  mergeMap,
  tap,
  delay,
  withLatestFrom,
  catchError
} from 'rxjs/operators';
import {
  from,
  zip,
  of,
  empty,
  merge,
  forkJoin
} from 'rxjs';

import {
  actions,

  handleError,

  authenticateIcp4d,
  authenticateStreamsInstance,

  clearQueuedAction,

  setStreamsInstances,
  setIcp4dAuthToken,
  setIcp4dAuthError,
  setStreamsAuthToken,
  setStreamsAuthError,

  getBuildArtifacts,
  getBuildArtifactsFulfilled,

  uploadSource,
  getBuildStatus,
  getBuildStatusFulfilled,
  getBuildLogMessagesFulfilled,
  startBuild,
  buildStatusReceived,

  refreshToolkits,
  setFormDataField
} from '../actions';
import StateSelector from '../util/state-selectors';
import ResponseSelector from '../util/rest-v5-response-selector';
import StreamsRestUtils from '../util/streams-rest-v5';
import SourceArchiveUtils from '../util/source-archive-utils';
import StatusUtils from '../util/status-utils';
import StreamsToolkitUtils from '../util/streams-toolkits-utils';
import { Keychain } from '../../../utils';
import MessageHandlerRegistry from '../../message-handler-registry';

/**
 * Consumes a NEW_BUILD action, creates a new build in the build service,
 * and emits a BUILD_UPLOAD_SOURCE action.
 * @param {*} action
 * @param {*} state
 */
const buildAppEpic = (action, state) => action.pipe(
  ofType(actions.NEW_BUILD),
  withLatestFrom(state),
  mergeMap(([a, s]) => StreamsRestUtils.build.create(s, { originator: 'vscode', name: action.sourceArchive }).pipe(
    map(createBuildResponse => {
      const buildId = ResponseSelector.getBuildId(createBuildResponse);
      if (!buildId) {
        throw new Error('Unable to retrieve build id');
      }
      const newBuild = StateSelector.getNewBuild(s, buildId);
      return uploadSource(
        buildId,
        newBuild.appRoot,
        newBuild.toolkitRootPath,
        newBuild.fqn,
        newBuild.makefilePath
      );
    }),
    catchError(error => of(handleError(a, error)))
  ))
);

/**
 * Consumes a BUILD_UPLOAD_SOURCE action, generates source archive zip file,
 * and emits a SOURCE_ARCHIVE_CREATED action.
 * @param {*} action
 * @param {*} state
 */
const uploadSourceEpic = (action, state) => action.pipe(
  ofType(actions.BUILD_UPLOAD_SOURCE),
  mergeMap(uploadAction => SourceArchiveUtils.buildSourceArchive({
    buildId: uploadAction.buildId,
    appRoot: uploadAction.appRoot,
    toolkitRootPath: uploadAction.toolkitRootPath,
    fqn: uploadAction.fqn,
    makefilePath: uploadAction.makefilePath
  })),
  catchError(error => of(handleError(action, error)))
);

/**
 * Consumes SOURCE_ARCHIVE_CREATED action, uploads source archive to build service,
 * and emits a START_BUILD action
 * @param {*} action
 * @param {*} state
 */
const sourceArchiveCreatedEpic = (action, state) => {
  return action.pipe(
    ofType(actions.SOURCE_ARCHIVE_CREATED),
    withLatestFrom(state),
    mergeMap(([sourceArchiveResponse, s]) => StreamsRestUtils.build.uploadSource(s, sourceArchiveResponse.buildId, sourceArchiveResponse.archivePath).pipe(
      map((a) => startBuild(sourceArchiveResponse.buildId)),
      tap(() => {
        if (fs.existsSync(sourceArchiveResponse.archivePath)) {
          fs.unlinkSync(sourceArchiveResponse.archivePath);
        }
      }),
      catchError(error => of(handleError(sourceArchiveResponse, error)))
    ))
  );
};

/**
 * Consumes START_BUILD action,
 * starts the build and emits an GET_BUILD_STATUS action
 * @param {*} action
 * @param {*} state
 */
const startBuildEpic = (action, state) => {
  return action.pipe(
    ofType(actions.START_BUILD),
    withLatestFrom(state),
    mergeMap(([a, s]) => StreamsRestUtils.build.start(s, a.buildId).pipe(
      delay(1000),
      map(() => getBuildStatus(a.buildId)),
      catchError(error => of(handleError(a, error)))
    ))
  );
};

/**
 * This epic handles requests for build status updates,
 * fetches build status and build log messages for action.buildId;
 * waits for get build status and build log messages actions to complete
 * and emits set of 3 actions,
 * BUILD_STATUS_FULFILLED, BUILD_LOG_FULFILLED, and BUILD_STATUS_RECEIVED.
 * FULFILLED actions update the state, RECEIVED action handles UI updates
 * and build status check loop.
 * @param {*} action
 */
const buildStatusEpic = (action, state) => action.pipe(
  ofType(actions.GET_BUILD_STATUS),
  withLatestFrom(state),
  // get build status and build message log and wait for both to complete,
  // passes on [BUILD_STATUS_FULFILLED, BUILD_LOG_FULFILLED]
  mergeMap(([a, s]) => zip(
    StreamsRestUtils.build.getStatus(s, a.buildId).pipe(
      map(response => getBuildStatusFulfilled(ResponseSelector.getBuildStatus(response))),
      catchError(error => of(handleError(a, error)))
    ),
    StreamsRestUtils.build.getLogMessages(s, a.buildId).pipe(
      tap(r => console.log('log response: ', r)),
      map(response => getBuildLogMessagesFulfilled({ buildId: a.buildId, logMessages: response.body.split('\n') })),
      catchError(error => of(handleError(a, error)))
    )
  )),
  // emit [BUILD_STATUS_FULFILLED, BUILD_LOG_FULFILLED, BUILD_STATUS_RECEIVED]
  mergeMap(([statusFulfilledAction, logFulfilledAction]) => [statusFulfilledAction, logFulfilledAction, buildStatusReceived(statusFulfilledAction.buildId)])
);

const buildStatusLoopEpic = (action, state) => action.pipe(
  ofType(actions.BUILD_STATUS_RECEIVED),
  withLatestFrom(state),
  tap(([a, s]) => {
    // message handling for updated build status
    StatusUtils.buildStatusUpdate(a, s);
  }),
  mergeMap(([a, s]) => merge(
    shouldGetBuildStatusHelperObservable(a, s).pipe(
      map(() => getBuildStatus(a.buildId)),
      catchError(error => of(handleError(a, error)))
    ),
    shouldGetArtifactsHelperObservable(a, s).pipe(
      map(() => getBuildArtifacts(a.buildId)),
      catchError(error => of(handleError(a, error)))
    )
  ))
);

const shouldGetBuildStatusHelperObservable = (action, state) => {
  const buildStatus = StateSelector.getBuildStatus(state, action.buildId);
  if (buildStatus === 'building' || buildStatus === 'created' || buildStatus === 'waiting') {
    return of(1).pipe(
      delay(5000)
    );
  }
  return empty();
};

const shouldGetArtifactsHelperObservable = (action, state) => {
  const buildStatus = StateSelector.getBuildStatus(state, action.buildId);
  if (buildStatus === 'built') {
    return of(1);
  }
  return empty();
};

const getBuildArtifactsEpic = (action, state) => action.pipe(
  ofType(actions.GET_BUILD_ARTIFACTS),
  withLatestFrom(state),
  mergeMap(([a, s]) => StreamsRestUtils.artifact.getArtifacts(s, a.buildId).pipe(
    map(artifactResponse => getBuildArtifactsFulfilled(a.buildId, ResponseSelector.getBuildArtifacts(artifactResponse))),
    catchError(error => of(handleError(a, error)))
  ))
);

const getBuildArtifactsFulfilledEpic = (action, state) => action.pipe(
  ofType(actions.GET_BUILD_ARTIFACTS_FULFILLED),
  withLatestFrom(state),
  tap(([a, s]) => {
    const { buildId } = a;
    StatusUtils.downloadOrSubmit(s, buildId);
  }),
  map(() => ({ type: 'dummy_action' }))
);

const downloadArtifactsEpic = (action, state) => action.pipe(
  ofType(actions.DOWNLOAD_APP_BUNDLES),
  withLatestFrom(state),
  mergeMap(([a, s]) => {
    const { buildId } = a;
    const artifacts = StateSelector.getBuildArtifacts(s, buildId);
    return from(artifacts).pipe(
      mergeMap(artifact => StreamsRestUtils.artifact.downloadApplicationBundle(s, buildId, artifact.id).pipe(
        map(downloadResponse => {
          const artifactId = artifact.id;
          const artifactOutputPath = StateSelector.getOutputArtifactFilePath(s, buildId, artifactId);
          try {
            if (fs.existsSync(artifactOutputPath)) {
              fs.unlinkSync(artifactOutputPath);
            }
            const outputDir = path.dirname(artifactOutputPath);
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir);
            }
            fs.writeFileSync(artifactOutputPath, downloadResponse.body);
            StatusUtils.appBundleDownloaded(s, buildId, artifact.name, artifactOutputPath);
          } catch (err) {
            console.error(err);
          }
        })
      )),
      map(() => ({ type: 'BUILD_ARTIFACT_DOWNLOADED' })),
      catchError(error => of(handleError(a, error)))
    );
  })
);

const submitApplicationsEpic = (action, state) => action.pipe(
  ofType(actions.SUBMIT_APPLICATIONS),
  withLatestFrom(state),
  mergeMap(([a, s]) => {
    const { buildId } = a;
    const artifacts = StateSelector.getBuildArtifacts(s, buildId);
    return from(artifacts).pipe(
      tap(submitArtifact => StatusUtils.submitJobStart(s, submitArtifact.name, buildId)),
      mergeMap(artifact => StreamsRestUtils.artifact.submitJob(
        s,
        artifact.applicationBundle,
        {}
      ).pipe(
        tap(submitResponse => {
          const submitInfo = ResponseSelector.getSubmitInfo(submitResponse);
          StatusUtils.jobSubmitted(s, submitInfo, buildId);
          console.log('submitResponse:', submitResponse);
        })
      )),
      tap(a1 => {
        console.log('downloadArtifacts post-tap', a1);
      }),
      map(() => ({ type: 'APPLICATION_SUBMITTED' })),
      catchError(error => of(handleError(a, error)))
    );
  })
);

const submitApplicationsFromBundleFilesEpic = (action, state) => action.pipe(
  ofType(actions.SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES),
  withLatestFrom(state),
  mergeMap(([a, s]) => {
    return from(a.bundles).pipe(
      tap((bundleToUpload) => {
        StatusUtils.submitJobStart(s, path.basename(bundleToUpload.bundlePath));
      }),
      mergeMap(bundle => StreamsRestUtils.artifact.uploadApplicationBundleToInstance(s, bundle.bundlePath).pipe(
        mergeMap(uploadBundleResponse => {
          const submitBundleId = ResponseSelector.getUploadedBundleId(uploadBundleResponse);
          return StreamsRestUtils.artifact.submitJob(s, submitBundleId, {}).pipe(
            tap(submitResponse => {
              const submitInfo = ResponseSelector.getSubmitInfo(submitResponse);
              StatusUtils.jobSubmitted(s, submitInfo);
              console.log('submitResponse:', submitResponse);
            }),
            map(() => ({ type: 'APPLICATION_SUBMITTED' }))
          );
        })
      )),
      catchError(error => of(handleError(a, error)))
    );
  })
);

const openStreamsConsoleEpic = (action, state) => action.pipe(
  ofType(actions.OPEN_STREAMS_CONSOLE),
  withLatestFrom(state),
  tap(([a, s]) => {
    MessageHandlerRegistry.openUrl(StateSelector.getStreamsConsoleUrl(s));
  }),
  map(() => ({ type: 'STREAMS_CONSOLE_OPENED' }))
);

const icp4dAuthEpic = (action, state) => action.pipe(
  ofType(actions.AUTHENTICATE_ICP4D),
  withLatestFrom(state),
  mergeMap(([a, s]) => StreamsRestUtils.icp4d.getIcp4dToken(s, a.username, a.password).pipe(
    tap(a1 => console.log('icp4d auth response: ', a1)),
    mergeMap(authTokenResponse => {
      const statusCode = ResponseSelector.getStatusCode(authTokenResponse);
      if (statusCode === 200) {
        if (a.rememberPassword) {
          Keychain.addCredentials(a.username, a.password);
        } else {
          Keychain.deleteCredentials(a.username);
        }
        return merge(
          of(setIcp4dAuthToken(ResponseSelector.getIcp4dAuthToken(authTokenResponse))),
          of(setIcp4dAuthError(false)),
          authDelayObservable().pipe(
            tap(() => {
              console.log('reauthenticating to icp4d');
            }),
            mergeMap(() => of(authenticateIcp4d(a.username, a.password, a.rememberPassword))),
            catchError(error => of(handleError(a, error)))
          )
        );
      }
      return of(setIcp4dAuthError(statusCode));
    }),
    catchError(error => of(handleError(a, error)))
  ))
);

const authDelayObservable = () => {
  return of(1).pipe(
    delay(19.5 * 60 * 1000) // icp4d auth tokens expire after 20 minutes
  );
};

const streamsAuthEpic = (action, state) => action.pipe(
  ofType(actions.AUTHENTICATE_STREAMS_INSTANCE),
  withLatestFrom(state),
  mergeMap(([authAction, s]) => StreamsRestUtils.icp4d.getStreamsAuthToken(s, authAction.instanceName).pipe(
    tap(() => {
      console.log('Queued action:', StateSelector.getQueuedAction(s));
    }),
    mergeMap(authTokenResponse => {
      const statusCode = ResponseSelector.getStatusCode(authTokenResponse);
      if (statusCode === 200) {
        return merge(
          of(setStreamsAuthToken(ResponseSelector.getStreamsAuthToken(authTokenResponse))),
          of(setStreamsAuthError(false)),
          of(refreshToolkits()),
          of(StateSelector.getQueuedAction(s)), // if there was a queued action, run it now...
          of(clearQueuedAction()),
          authDelayObservable().pipe(
            tap(() => {
              console.log('reauthenticating to streams instance');
            }),
            mergeMap(() => of(authenticateStreamsInstance(authAction.instanceName))),
            catchError(error => of(handleError(authAction, error)))
          )
        );
      }
      return of(setStreamsAuthError(true));
    }),
    catchError(error => of(handleError(authAction, error)))
  ))
);

const getStreamsInstancesEpic = (action, state) => action.pipe(
  ofType(actions.SET_ICP4D_AUTH_TOKEN),
  withLatestFrom(state),
  mergeMap(([a, s]) => StreamsRestUtils.icp4d.getServiceInstances(s).pipe(
    map(serviceInstancesResponse => ResponseSelector.getStreamsInstances(serviceInstancesResponse)),
    map(streamsInstances => setStreamsInstances(streamsInstances)),
    catchError(error => of(handleError(a, error)))
  ))
);

const instanceSelectedEpic = (action, state) => action.pipe(
  ofType(actions.SET_SELECTED_INSTANCE),
  withLatestFrom(state),
  map(([a, s]) => authenticateStreamsInstance(StateSelector.getSelectedInstanceName(s)))
);

const refreshToolkitsEpic = (action, state) => action.pipe(
  ofType(actions.REFRESH_TOOLKITS),
  withLatestFrom(state),
  mergeMap(([a, s]) => StreamsRestUtils.toolkit.getToolkits(s).pipe(
    tap(() => MessageHandlerRegistry.getDefault().handleInfo('Initializing toolkit index cache')),
    map(toolkitsResponse => ResponseSelector.getToolkits(toolkitsResponse)),
    map(toolkits => StreamsToolkitUtils.getToolkitsToCache(s, toolkits)),
    tap(a1 => console.log('refreshTK,a', a1)),
    mergeMap(toolkitsToCache => forkJoin(from(toolkitsToCache).pipe(
      tap(a1 => console.log('refreshTK,b', a1)),
      mergeMap(toolkitToCache => StreamsRestUtils.toolkit.getToolkitIndex(s, toolkitToCache.id).pipe(
        tap(a1 => console.log('refreshTK,c', a1)),
        map(toolkitIndexResponse => StreamsToolkitUtils.cacheToolkitIndex(s, toolkitToCache, toolkitIndexResponse.body))
      )),
      defaultIfEmpty('empty')
    ))),
    tap(() => StreamsToolkitUtils.refreshLspToolkits(s, MessageHandlerRegistry.sendLspNotification)),
    map(() => ({ type: 'TOOLKITS_CACHED' })),
    tap(() => MessageHandlerRegistry.getDefault().handleSuccess('Toolkit indexes cached successfully', { notificationAutoDismiss: true })),
    catchError(error => of(handleError(a, error)))
  ))
);

const packageActivatedEpic = (action, state) => action.pipe(
  ofType(actions.PACKAGE_ACTIVATED),
  withLatestFrom(state),
  map(([a, s]) => {
    const username = StateSelector.getUsername(s);
    const rememberPassword = StateSelector.getRememberPassword(s);
    if (username && rememberPassword) {
      const password = Keychain.getCredentials(username);
      if (password) {
        return setFormDataField('password', password);
      }
    }
    return { type: 'DUMMY_PACKAGE_ACTIVATED_END' };
  })
);

const errorHandlingEpic = (action, state) => action.pipe(
  ofType(actions.ERROR),
  withLatestFrom(state),
  tap(([a, s]) => {
    console.error('error occurred in action: ', a.sourceAction.type, '\nerror: ', a.error);
    if (typeof a.error === 'string') {
      MessageHandlerRegistry.getDefault().handleError(a.error, { detail: a.sourceAction.type });
    } else if (a.error) {
      MessageHandlerRegistry.getDefault().handleError(a.error.message, { detail: `${a.sourceAction.type}\n\n${a.error.stack}` });
    }
  }),
  map(() => ({ type: 'ERROR_HANDLED' }))
);

const executeCallbackEpic = (action, state) => action.pipe(
  ofType(actions.EXECUTE_CALLBACK_FN),
  withLatestFrom(state),
  tap(([a, s]) => {
    const queuedAction = StateSelector.getQueuedAction(s);
    if (queuedAction.callbackFn) {
      queuedAction.callbackFn();
    }
  }),
  map(() => ({ type: 'CALLBACK_EXECUTED' }))
);

const rootEpic = combineEpics(
  errorHandlingEpic,

  buildAppEpic,
  buildStatusEpic,
  uploadSourceEpic,
  sourceArchiveCreatedEpic,
  startBuildEpic,
  buildStatusLoopEpic,

  getBuildArtifactsEpic,
  getBuildArtifactsFulfilledEpic,
  downloadArtifactsEpic,
  submitApplicationsEpic,
  submitApplicationsFromBundleFilesEpic,

  openStreamsConsoleEpic,

  instanceSelectedEpic,
  icp4dAuthEpic,
  streamsAuthEpic,
  getStreamsInstancesEpic,

  packageActivatedEpic,

  refreshToolkitsEpic,

  executeCallbackEpic

);

export default rootEpic;
