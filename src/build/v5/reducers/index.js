import * as _ from 'lodash';
import { combineReducers } from 'redux';
import { actions } from '../actions';
import { inDebugMode } from '../../../utils';

const streamsV5Build = (state = [], action) => {
  if (inDebugMode()) {
    console.log('buildV5Reducer Action: ', action);
    console.log('buildV5Reducer State before modification: ', state);
  }

  switch (action.type) {
    case actions.SET_BUILD_ORIGINATOR:
      return {
        ...state,
        buildOriginator: `${action.originator}::${action.version}`
      };
    case actions.PACKAGE_ACTIVATED:
      return {
        ...state,
        packageActivated: true
      };
    case actions.SET_ICP4D_URL:
      return {
        ...state,
        icp4dUrl: action.icp4dUrl
      };
    case actions.SET_USE_ICP4D_MASTER_NODE_HOST:
      return {
        ...state,
        useIcp4dMasterNodeHost: action.useIcp4dMasterNodeHost
      };
    case actions.SET_CURRENT_LOGIN_STEP:
      return {
        ...state,
        currentLoginStep: action.currentLoginStep
      };
    case actions.SET_USERNAME:
      return {
        ...state,
        formData: {
          ...state.formData,
          username: action.username
        }
      };
    case actions.SET_PASSWORD:
      return {
        ...state,
        formData: {
          ...state.formData,
          password: action.password
        }
      };
    case actions.SET_REMEMBER_PASSWORD:
      return {
        ...state,
        formData: {
          ...state.formData,
          rememberPassword: action.rememberPassword
        }
      };
    case actions.SET_FORM_DATA_FIELD:
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.key]: action.value
        }
      };
    case actions.LOGIN_FORM_INITIALIZED:
      return {
        ...state,
        formData: {
          ...state.formData,
          loginFormInitialized: true
        }
      };
    case actions.QUEUE_ACTION:
      return {
        ...state,
        queuedAction: action.queuedAction
      };
    case actions.CLEAR_QUEUED_ACTION:
      return {
        ...state,
        queuedAction: null
      };
    case actions.AUTHENTICATE_ICP4D:
      return {
        ...state,
        username: action.username,
        rememberPassword: action.rememberPassword
      };
    case actions.SET_STREAMS_INSTANCES:
      return {
        ...state,
        streamsInstances: action.streamsInstances
      };
    case actions.SET_SELECTED_INSTANCE:
      return {
        ...state,
        currentLoginStep: action.currentLoginStep,
        selectedInstance: {
          serviceInstanceId: action.ID,
          instanceName: action.ServiceInstanceDisplayName,
          serviceInstanceVersion: action.ServiceInstanceVersion,
          streamsRestUrl: action.CreateArguments['connection-info'].externalRestEndpoint,
          streamsBuildRestUrl: action.CreateArguments['connection-info'].externalBuildEndpoint,
          streamsConsoleUrl: action.CreateArguments['connection-info'].externalConsoleEndpoint,
          streamsJmxUrl: action.CreateArguments['connection-info'].externalJmxEndpoint
        }
      };
    case actions.SET_ICP4D_AUTH_TOKEN:
      return {
        ...state,
        icp4dAuthToken: action.authToken,
        currentLoginStep: action.currentLoginStep
      };
    case actions.SET_ICP4D_AUTH_ERROR:
      return {
        ...state,
        icp4dAuthError: action.authError,
        ...(!action.authError && { formData: {} }) // RESET FORM DATA TO EMPTY
      };
    case actions.SET_STREAMS_AUTH_TOKEN:
      return {
        ...state,
        selectedInstance: {
          ...state.selectedInstance,
          streamsAuthToken: action.authToken
        }
      };
    case actions.SET_STREAMS_AUTH_ERROR:
      return {
        ...state,
        streamsAuthError: action.authError
      };
    case actions.RESET_AUTH:
      return _.omit(state, [
        'icp4dAuthToken',
        'icp4dAuthError',
        'streamsInstances',
        'selectedInstance',
        'streamsAuthError'
      ]);
    case actions.NEW_BUILD:
      return {
        ...state,
        builds: {
          ...state.builds,
          [state.selectedInstance.instanceName]: {
            ...(state.builds && state.builds[state.selectedInstance.instanceName]),
            newBuild: {
              appRoot: action.appRoot,
              toolkitRootPath: action.toolkitRootPath,
              fqn: action.fqn,
              makefilePath: action.makefilePath,
              postBuildAction: action.postBuildAction
            }
          }
        }
      };
    case actions.GET_BUILD_STATUS_FULFILLED:
      return {
        ...state,
        builds: {
          ...state.builds,
          [state.selectedInstance.instanceName]: {
            ...(state.builds && state.builds[state.selectedInstance.instanceName]),
            [action.buildId]: {
              ...state.builds[state.selectedInstance.instanceName][action.buildId],
              status: action.status,
              inactivityTimeout: action.inactivityTimeout,
              lastActivityTime: action.lastActivityTime,
              submitCount: action.submitCount,
              buildId: action.buildId
            }
          }
        }
      };
    case actions.GET_BUILD_LOG_MESSAGES_FULFILLED:
      return {
        ...state,
        builds: {
          ...state.builds,
          [state.selectedInstance.instanceName]: {
            ...(state.builds && state.builds[state.selectedInstance.instanceName]),
            [action.buildId]: {
              ...state.builds[state.selectedInstance.instanceName][action.buildId],
              logMessages: action.logMessages
            }
          }
        }
      };
    case actions.BUILD_UPLOAD_SOURCE:
      return {
        ...state,
        builds: {
          ...state.builds,
          [state.selectedInstance.instanceName]: {
            ...(state.builds && state.builds[state.selectedInstance.instanceName]),
            [action.buildId]: {
              ...state.builds[state.selectedInstance.instanceName][action.buildId],
              buildId: action.buildId,
              appRoot: state.builds[state.selectedInstance.instanceName].newBuild.appRoot,
              toolkitRootPath: state.builds[state.selectedInstance.instanceName].newBuild.toolkitRootPath,
              fqn: state.builds[state.selectedInstance.instanceName].newBuild.fqn,
              makefilePath: state.builds[state.selectedInstance.instanceName].newBuild.makefilePath,
              postBuildAction: state.builds[state.selectedInstance.instanceName].newBuild.postBuildAction
            }
          }
        }
      };
    case actions.GET_BUILD_ARTIFACTS_FULFILLED:
      return {
        ...state,
        builds: {
          ...state.builds,
          [state.selectedInstance.instanceName]: {
            ...(state.builds && state.builds[state.selectedInstance.instanceName]),
            [action.buildId]: {
              ...state.builds[state.selectedInstance.instanceName][action.buildId],
              artifacts: action.artifacts
            }
          }
        }
      };
    case actions.SET_TOOLKITS_CACHE_DIR:
      return {
        ...state,
        toolkitsCacheDir: action.toolkitsCacheDir
      };
    case actions.SET_TOOLKITS_PATH_SETTING:
      return {
        ...state,
        toolkitsPathSetting: action.toolkitsPathSetting
      };
    default:
      return state;
  }
};

const rootReducer = combineReducers({
  streamsV5Build
});

export default rootReducer;
