import _cloneDeep from 'lodash/cloneDeep';

const initialState = {
  isLoadingAppInfo: false,
  isShowAllOptionsToggled: false,
  // Job run
  jobRunName: '',
  jobRunNameError: false,
  jobRunDescription: '',
  jobRunDescriptionError: false,
  // Streams job name
  streamsJobName: '',
  streamsJobNameError: false,
  // Application bundle
  existingAppBundle: null,
  existingRawSubmissionTimeParams: null,
  existingInitialSubmissionTimeParams: null,
  appBundleFilePath: '',
  appBundleFilePathError: false,
  // Submission-time parameters
  isLoadingSubmissionTimeParams: false,
  rawSubmissionTimeParams: null,
  initialSubmissionTimeParams: null,
  // Job configuration overlay
  existingJobConfigOverlay: null,
  jobConfigOverlay: null,
  selectedJobConfigOverlayFile: null
};

const Action = Object.freeze({
  SET_IS_LOADING_APP_INFO: 'setIsLoadingAppInfo',
  SET_IS_SHOW_ALL_OPTIONS_TOGGLED: 'setIsShowAllOptionsToggled',
  // Job run
  SET_JOB_RUN_NAME: 'setJobRunName',
  SET_JOB_RUN_NAME_ERROR: 'setJobRunNameError',
  SET_JOB_RUN_DESCRIPTION: 'setJobRunDescription',
  SET_JOB_RUN_DESCRIPTION_ERROR: 'setJobRunDescriptionError',
  // Streams job name
  SET_STREAMS_JOB_NAME: 'setStreamsJobName',
  SET_STREAMS_JOB_NAME_ERROR: 'setStreamsJobNameError',
  // Application bundle
  SET_EXISTING_APP_BUNDLE: 'setExistingAppBundle',
  SET_EXISTING_RAW_SUBMISSION_TIME_PARAMS: 'setExistingRawSubmissionTimeParams',
  SET_EXISTING_INITIAL_SUBMISSION_TIME_PARAMS:
    'setExistingInitialSubmissionTimeParams',
  SET_APP_BUNDLE_FILE_PATH: 'setAppBundleFilePath',
  SET_APP_BUNDLE_FILE_PATH_ERROR: 'setAppBundleFilePathError',
  // Submission-time parameters
  SET_IS_LOADING_SUBMISSION_TIME_PARAMS: 'setIsLoadingSubmissionTimeParams',
  SET_RAW_SUBMISSION_TIME_PARAMS: 'setRawSubmissionTimeParams',
  SET_INITIAL_SUBMISSION_TIME_PARAMS: 'setInitialSubmissionTimeParams',
  // Job configuration overlay
  SET_EXISTING_JOB_CONFIG_OVERLAY: 'setExistingJobConfigOverlay',
  SET_JOB_CONFIG_OVERLAY: 'setJobConfigOverlay',
  SET_SUBMISSION_TIME_PARAMS_IN_JOB_CONFIG_OVERLAY:
    'setSubmissionTimeParamsInJobConfigOverlay',
  SET_SELECTED_JOB_CONFIG_OVERLAY_FILE: 'setSelectedJobConfigOverlayFile'
});

const reducer = (state, action) => {
  const { type, payload } = action;
  switch (type) {
    case Action.SET_IS_LOADING_APP_INFO:
      return { ...state, isLoadingAppInfo: payload };
    case Action.SET_IS_SHOW_ALL_OPTIONS_TOGGLED:
      return { ...state, isShowAllOptionsToggled: payload };
    // Job run
    case Action.SET_JOB_RUN_NAME:
      return { ...state, jobRunName: payload };
    case Action.SET_JOB_RUN_NAME_ERROR:
      return { ...state, jobRunNameError: payload };
    case Action.SET_JOB_RUN_DESCRIPTION:
      return { ...state, jobRunDescription: payload };
    case Action.SET_JOB_RUN_DESCRIPTION_ERROR:
      return { ...state, jobRunDescriptionError: payload };
    // Streams job name
    case Action.SET_STREAMS_JOB_NAME: {
      if (payload.trim() === '' && state.jobConfigOverlay) {
        const newJobConfigOverlay = _cloneDeep(state.jobConfigOverlay);
        if (newJobConfigOverlay?.jobConfigOverlays?.[0]?.jobConfig?.jobName) {
          delete newJobConfigOverlay.jobConfigOverlays[0].jobConfig.jobName;
        }
        return {
          ...state,
          streamsJobName: payload,
          jobConfigOverlay: newJobConfigOverlay
        };
      }
      if (!state.jobConfigOverlay) {
        return {
          ...state,
          streamsJobName: payload,
          jobConfigOverlay: {
            jobConfigOverlays: [
              {
                jobConfig: {
                  jobName: payload
                }
              }
            ]
          }
        };
      }
      const newJobConfigOverlay = _cloneDeep(state.jobConfigOverlay);
      if (!newJobConfigOverlay.jobConfigOverlays) {
        newJobConfigOverlay.jobConfigOverlays = [];
      }
      if (!newJobConfigOverlay.jobConfigOverlays.length) {
        newJobConfigOverlay.jobConfigOverlays.push({});
      }
      if (!newJobConfigOverlay.jobConfigOverlays[0].jobConfig) {
        newJobConfigOverlay.jobConfigOverlays[0].jobConfig = {};
      }
      newJobConfigOverlay.jobConfigOverlays[0].jobConfig.jobName = payload;
      return {
        ...state,
        streamsJobName: payload,
        jobConfigOverlay: newJobConfigOverlay
      };
    }
    case Action.SET_STREAMS_JOB_NAME_ERROR: {
      if (payload && state.jobConfigOverlay) {
        const newJobConfigOverlay = _cloneDeep(state.jobConfigOverlay);
        if (newJobConfigOverlay?.jobConfigOverlays?.[0]?.jobConfig?.jobName) {
          delete newJobConfigOverlay.jobConfigOverlays[0].jobConfig.jobName;
        }
        return {
          ...state,
          streamsJobNameError: payload,
          jobConfigOverlay: newJobConfigOverlay
        };
      }
      return { ...state, streamsJobNameError: payload };
    }
    // Application bundle
    case Action.SET_EXISTING_APP_BUNDLE:
      return { ...state, existingAppBundle: payload };
    case Action.SET_EXISTING_RAW_SUBMISSION_TIME_PARAMS:
      return { ...state, existingRawSubmissionTimeParams: payload };
    case Action.SET_EXISTING_INITIAL_SUBMISSION_TIME_PARAMS:
      return { ...state, existingInitialSubmissionTimeParams: payload };
    case Action.SET_APP_BUNDLE_FILE_PATH:
      return { ...state, appBundleFilePath: payload };
    case Action.SET_APP_BUNDLE_FILE_PATH_ERROR:
      return { ...state, appBundleFilePathError: payload };
    // Submission-time parameters
    case Action.SET_IS_LOADING_SUBMISSION_TIME_PARAMS:
      return { ...state, isLoadingSubmissionTimeParams: payload };
    case Action.SET_RAW_SUBMISSION_TIME_PARAMS:
      return { ...state, rawSubmissionTimeParams: payload };
    case Action.SET_INITIAL_SUBMISSION_TIME_PARAMS:
      return { ...state, initialSubmissionTimeParams: payload };
    // Job configuration overlay
    case Action.SET_EXISTING_JOB_CONFIG_OVERLAY:
      return { ...state, existingJobConfigOverlay: payload };
    case Action.SET_JOB_CONFIG_OVERLAY:
      return { ...state, jobConfigOverlay: payload };
    case Action.SET_SUBMISSION_TIME_PARAMS_IN_JOB_CONFIG_OVERLAY: {
      if (!state.jobConfigOverlay) {
        return {
          ...state,
          jobConfigOverlay: {
            jobConfigOverlays: [
              {
                jobConfig: {
                  submissionParameters: payload
                }
              }
            ]
          }
        };
      }
      const newJobConfigOverlay = _cloneDeep(state.jobConfigOverlay);
      if (!newJobConfigOverlay.jobConfigOverlays) {
        newJobConfigOverlay.jobConfigOverlays = [];
      }
      if (!newJobConfigOverlay.jobConfigOverlays.length) {
        newJobConfigOverlay.jobConfigOverlays.push({});
      }
      if (!newJobConfigOverlay.jobConfigOverlays[0].jobConfig) {
        newJobConfigOverlay.jobConfigOverlays[0].jobConfig = {};
      }
      newJobConfigOverlay.jobConfigOverlays[0].jobConfig.submissionParameters = payload;
      return { ...state, jobConfigOverlay: newJobConfigOverlay };
    }
    case Action.SET_SELECTED_JOB_CONFIG_OVERLAY_FILE:
      return { ...state, selectedJobConfigOverlayFile: payload };
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
};

export { initialState, Action, reducer };
