export const packageActivated = () => ({
  type: actions.PACKAGE_ACTIVATED
});

export const setIcp4dUrl = (icp4dUrl) => ({
  type: actions.SET_ICP4D_URL,
  icp4dUrl
});

export const setUseIcp4dMasterNodeHost = (useIcp4dMasterNodeHost) => ({
  type: actions.SET_USE_ICP4D_MASTER_NODE_HOST,
  useIcp4dMasterNodeHost
});

export const setCurrentLoginStep = (step) => ({
  type: actions.SET_CURRENT_LOGIN_STEP,
  currentLoginStep: step
});

export const setUsername = (username) => ({
  type: actions.SET_USERNAME,
  username
});

export const setPassword = (password) => ({
  type: actions.SET_PASSWORD,
  password
});

export const setRememberPassword = (rememberPassword) => ({
  type: actions.SET_REMEMBER_PASSWORD,
  rememberPassword
});

export const setFormDataField = (key, value) => ({
  type: actions.SET_FORM_DATA_FIELD,
  key,
  value
});

export const setBuildOriginator = (originator, version) => ({
  type: actions.SET_BUILD_ORIGINATOR,
  originator,
  version
});

export const queueAction = (queuedAction) => ({
  type: actions.QUEUE_ACTION,
  queuedAction
});

export const clearQueuedAction = () => ({
  type: actions.CLEAR_QUEUED_ACTION
});

export const checkIcp4dUrlExists = (successFn, errorFn) => ({
  type: actions.CHECK_ICP4D_URL_EXISTS,
  successFn,
  errorFn
});

export const authenticateIcp4d = (username, password, rememberPassword) => ({
  type: actions.AUTHENTICATE_ICP4D,
  username,
  password,
  rememberPassword
});

export const authenticateStreamsInstance = (instanceName) => ({
  type: actions.AUTHENTICATE_STREAMS_INSTANCE,
  instanceName
});

export const setStreamsInstances = (streamsInstances) => ({
  type: actions.SET_STREAMS_INSTANCES,
  streamsInstances
});

export const setSelectedInstance = (streamsInstance) => ({
  type: actions.SET_SELECTED_INSTANCE,
  ...streamsInstance,
  currentLoginStep: 3
});

export const setIcp4dAuthToken = (authToken) => ({
  type: actions.SET_ICP4D_AUTH_TOKEN,
  authToken,
  currentLoginStep: 2
});

export const setIcp4dAuthError = (authError) => ({
  type: actions.SET_ICP4D_AUTH_ERROR,
  authError
});

export const setStreamsAuthToken = (authToken) => ({
  type: actions.SET_STREAMS_AUTH_TOKEN,
  authToken
});

export const setStreamsAuthError = (authError) => ({
  type: actions.SET_STREAMS_AUTH_ERROR,
  authError
});

export const resetAuth = () => ({
  type: actions.RESET_AUTH
});

export const startBuild = (buildId) => ({
  type: actions.START_BUILD,
  buildId
});

export const newBuild = ({
  appRoot,
  toolkitRootPath,
  fqn,
  makefilePath,
  postBuildAction
}) => ({
  type: actions.NEW_BUILD,
  appRoot,
  toolkitRootPath,
  fqn,
  makefilePath,
  postBuildAction
});

export const uploadSource = (
  buildId,
  appRoot,
  toolkitRootPath,
  fqn,
  makefilePath
) => ({
  type: actions.BUILD_UPLOAD_SOURCE,
  buildId,
  appRoot,
  toolkitRootPath,
  fqn,
  makefilePath
});

export const getBuildStatus = (buildId) => ({
  type: actions.GET_BUILD_STATUS,
  buildId
});

export const logBuildStatus = (buildId) => ({
  type: actions.LOG_BUILD_STATUS,
  buildId
});

export const getBuildStatusFulfilled = (buildStatusResponse) => ({
  type: actions.GET_BUILD_STATUS_FULFILLED,
  ...buildStatusResponse
});

export const getBuildLogMessagesFulfilled = (buildLogMessagesResponse) => ({
  type: actions.GET_BUILD_LOG_MESSAGES_FULFILLED,
  ...buildLogMessagesResponse
});

export const buildSucceeded = (buildId) => ({
  type: actions.BUILD_SUCCESS,
  buildId
});

export const buildFailed = (buildId) => ({
  type: actions.BUILD_FAILED,
  buildId
});

export const buildInProgress = (buildId) => ({
  type: actions.BUILD_IN_PROGRESS,
  buildId
});

export const buildStatusReceived = (buildId) => ({
  type: actions.BUILD_STATUS_RECEIVED,
  buildId
});

export const getBuildArtifacts = (buildId) => ({
  type: actions.GET_BUILD_ARTIFACTS,
  buildId
});

export const getBuildArtifactsFulfilled = (buildId, artifacts) => ({
  type: actions.GET_BUILD_ARTIFACTS_FULFILLED,
  buildId,
  artifacts
});

export const downloadAppBundles = (buildId) => ({
  type: actions.DOWNLOAD_APP_BUNDLES,
  buildId
});

export const submitApplications = (buildId, fromArtifact) => ({
  type: actions.SUBMIT_APPLICATIONS,
  buildId,
  fromArtifact
});

export const submitApplicationsFromBundleFiles = (bundles) => ({
  type: actions.SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES,
  bundles
});

export const openStreamingAnalyticsConsole = () => ({
  type: actions.OPEN_STREAMS_CONSOLE
});

export const refreshToolkits = () => ({
  type: actions.REFRESH_TOOLKITS
});

export const setToolkitsCacheDir = (toolkitsCacheDir) => ({
  type: actions.SET_TOOLKITS_CACHE_DIR,
  toolkitsCacheDir
});

export const setToolkitsPathSetting = (toolkitsPathSetting) => ({
  type: actions.SET_TOOLKITS_PATH_SETTING,
  toolkitsPathSetting
});

export const handleError = (sourceAction, error) => ({
  type: actions.ERROR,
  sourceAction,
  error
});

export const executeCallbackFn = (callbackFn) => ({
  type: actions.EXECUTE_CALLBACK_FN,
  callbackFn
});

export const actions = {
  PACKAGE_ACTIVATED: 'PACKAGE_ACTIVATED',
  SET_BUILD_ORIGINATOR: 'SET_BUILD_ORIGINATOR',
  ERROR: 'ERROR',
  SET_CURRENT_LOGIN_STEP: 'SET_CURRENT_LOGIN_STEP',
  SET_ICP4D_URL: 'SET_ICP4D_URL',
  SET_USE_ICP4D_MASTER_NODE_HOST: 'SET_USE_ICP4D_MASTER_NODE_HOST',
  SET_USERNAME: 'SET_USERNAME',
  SET_PASSWORD: 'SET_PASSWORD',
  SET_REMEMBER_PASSWORD: 'SET_REMEMBER_PASSWORD',
  SET_FORM_DATA_FIELD: 'SET_FORM_DATA_FIELD',
  CHECK_ICP4D_URL_EXISTS: 'CHECK_ICP4D_URL_EXISTS',
  AUTHENTICATE_ICP4D: 'AUTHENTICATE_ICP4D',
  AUTHENTICATE_STREAMS_INSTANCE: 'AUTHENTICATE_STREAMS_INSTANCE',
  SET_ICP4D_AUTH_TOKEN: 'SET_ICP4D_AUTH_TOKEN',
  SET_ICP4D_AUTH_ERROR: 'SET_ICP4D_AUTH_ERROR',
  SET_SELECTED_INSTANCE: 'SET_SELECTED_INSTANCE',
  SET_STREAMS_AUTH_TOKEN: 'SET_STREAMS_AUTH_TOKEN',
  SET_STREAMS_AUTH_ERROR: 'SET_STREAMS_AUTH_ERROR',
  SET_STREAMS_INSTANCES: 'SET_STREAMS_INSTANCES',
  RESET_AUTH: 'RESET_AUTH',

  QUEUE_ACTION: 'QUEUE_ACTION',
  CLEAR_QUEUED_ACTION: 'CLEAR_QUEUED_ACTION',

  NEW_BUILD: 'NEW_BUILD',
  START_BUILD: 'START_BUILD',
  BUILD_UPLOAD_SOURCE: 'BUILD_UPLOAD_SOURCE',
  SOURCE_ARCHIVE_CREATED: 'SOURCE_ARCHIVE_CREATED',

  GET_BUILD_STATUS: 'GET_BUILD_STATUS',
  GET_BUILD_STATUS_FULFILLED: 'GET_BUILD_STATUS_FULFILLED',
  GET_BUILD_LOG_MESSAGES_FULFILLED: 'GET_BUILD_LOG_MESSAGES_FULFILLED',
  LOG_BUILD_STATUS: 'LOG_BUILD_STATUS',
  BUILD_SUCCESS: 'BUILD_SUCCESS',
  BUILD_FAILED: 'BUILD_FAILED',
  BUILD_IN_PROGRESS: 'BUILD_IN_PROGRESS',
  BUILD_STATUS_RECEIVED: 'BUILD_STATUS_RECEIVED',

  GET_BUILD_ARTIFACTS: 'GET_BUILD_ARTIFACTS',
  GET_BUILD_ARTIFACTS_FULFILLED: 'GET_BUILD_ARTIFACTS_FULFILLED',

  DOWNLOAD_APP_BUNDLES: 'DOWNLOAD_APP_BUNDLES',
  SUBMIT_APPLICATIONS: 'SUBMIT_APPLICATIONS',
  SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES: 'SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES',

  REFRESH_TOOLKITS: 'REFRESH_TOOLKITS',
  SET_TOOLKITS_CACHE_DIR: 'SET_TOOLKITS_CACHE_DIR',
  SET_TOOLKITS_PATH_SETTING: 'SET_TOOLKITS_PATH_SETTING',

  OPEN_STREAMS_CONSOLE: 'OPEN_STREAMS_CONSOLE',
  OPEN_ICP4D_CONSOLE: 'OPEN_ICP4D_CONSOLE',

  EXECUTE_CALLBACK_FN: 'EXECUTE_CALLBACK_FN',

  POST_PACKAGE_ACTIVATED: 'POST_PACKAGE_ACTIVATED',
  POST_ERROR: 'POST_ERROR',
  POST_CHECK_ICP4D_URL_EXISTS: 'POST_CHECK_ICP4D_URL_EXISTS',
  POST_GET_BUILD_ARTIFACTS_FULFILLED: 'POST_GET_BUILD_ARTIFACTS_FULFILLED',
  POST_DOWNLOAD_ARTIFACTS: 'POST_DOWNLOAD_ARTIFACTS',
  POST_SUBMIT_APPLICATIONS: 'POST_SUBMIT_APPLICATIONS',
  POST_SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES: 'POST_SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES',
  POST_OPEN_STREAMS_CONSOLE: 'POST_OPEN_STREAMS_CONSOLE',
  POST_REFRESH_TOOLKITS: 'POST_REFRESH_TOOLKITS',
  POST_CALLBACK: 'POST_CALLBACK'
};
