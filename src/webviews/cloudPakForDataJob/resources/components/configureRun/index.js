import Toggle from 'carbon-components-react/es/components/Toggle';
import _cloneDeep from 'lodash/cloneDeep';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import ButtonContainer from '../../../../commonComponents/ButtonContainer';
import MessageHandler from '../../../../message.ts';
import { useDispatch, useState } from '../../context';
import { Action } from '../../reducers/configureRunReducer';
import Utils from '../../utils';
import AppBundleContainer from './AppBundleContainer';
import JobConfigOverlayContainer from './JobConfigOverlayContainer';
import JobRunContainer from './JobRunContainer';
import StreamsJobNameContainer from './StreamsJobNameContainer';
import SubmissionParamsContainer from './SubmissionParamsContainer';

export const Property = {
  JOB_RUN_NAME: 'jobRunName',
  JOB_RUN_DESCRIPTION: 'jobRunDescription',
  STREAMS_JOB_NAME: 'streamsJobName',
  APP_BUNDLE_FILE_PATH: 'appBundleFilePath',
  JOB_CONFIG_OVERLAY: 'jobConfigOverlay'
};

const ConfigureRunContainer = ({
  messageHandler,
  params: { jobName, appBundle, jobConfigurationOverlay }
}) => {
  const dispatch = useDispatch();
  const {
    isLoadingAppInfo,
    isShowAllOptionsToggled,
    jobRunName,
    jobRunNameError,
    jobRunDescription,
    jobRunDescriptionError,
    streamsJobNameError,
    existingAppBundle,
    appBundleFilePath,
    appBundleFilePathError,
    isLoadingSubmissionTimeParams,
    initialSubmissionTimeParams,
    jobConfigOverlay
  } = useState();

  // Run when component is mounted
  useEffect(() => {
    dispatch({ type: Action.SET_IS_LOADING_APP_INFO, payload: true });
  }, []);

  // Run when component is mounted
  useEffect(() => {
    dispatch({ type: Action.SET_IS_LOADING_APP_INFO, payload: true });

    if (appBundle) {
      dispatch({ type: Action.SET_EXISTING_APP_BUNDLE, payload: appBundle });
    }

    if (jobConfigurationOverlay) {
      dispatch({
        type: Action.SET_EXISTING_JOB_CONFIG_OVERLAY,
        payload: jobConfigurationOverlay
      });
      dispatch({
        type: Action.SET_JOB_CONFIG_OVERLAY,
        payload: jobConfigurationOverlay
      });
    }
  }, []);

  // Get application information when the component mounts
  useEffect(() => {
    async function getAppInfo() {
      const { submissionTimeParams } = await messageHandler.postMessage({
        command: 'get-app-info'
      });
      if (submissionTimeParams) {
        dispatch({
          type: Action.SET_EXISTING_RAW_SUBMISSION_TIME_PARAMS,
          payload: submissionTimeParams
        });
        dispatch({
          type: Action.SET_RAW_SUBMISSION_TIME_PARAMS,
          payload: submissionTimeParams
        });
        const initialParams = Utils.processSubmissionTimeParams(
          submissionTimeParams
        );
        dispatch({
          type: Action.SET_EXISTING_INITIAL_SUBMISSION_TIME_PARAMS,
          payload: initialParams
        });
        dispatch({
          type: Action.SET_INITIAL_SUBMISSION_TIME_PARAMS,
          payload: initialParams
        });
      }

      dispatch({ type: Action.SET_IS_LOADING_APP_INFO, payload: false });
    }

    if (isLoadingAppInfo) {
      getAppInfo();
    }
  }, [isLoadingAppInfo]);

  const getButtonContainer = () => {
    const submissionParamsFromJobConfigOverlay = _cloneDeep(
      jobConfigOverlay?.jobConfigOverlays?.[0]?.jobConfig?.submissionParameters
    );

    // True if errors, false otherwise
    const errors = {
      isLoadingAppInfo,
      [Property.JOB_RUN_NAME]: jobRunNameError,
      [Property.JOB_RUN_DESCRIPTION]: jobRunDescriptionError,
      [Property.STREAMS_JOB_NAME]: streamsJobNameError,
      [Property.APP_BUNDLE_FILE_PATH]:
        !existingAppBundle &&
        (appBundleFilePath.trim() === '' || appBundleFilePathError),
      isLoadingSubmissionTimeParams,
      emptySubmissionTimeParams: submissionParamsFromJobConfigOverlay
        ? submissionParamsFromJobConfigOverlay.some(
            (param) => param.value.trim() === ''
          )
        : false
    };

    const isValid = !Object.keys(errors).some((e) => errors[e]);

    return (
      <ButtonContainer
        primaryBtn={{
          label: 'Start job run',
          isValid,
          onClick: () => {
            // Omit submission-time values that are the same as the default values
            if (submissionParamsFromJobConfigOverlay) {
              submissionParamsFromJobConfigOverlay.filter(({ name, value }) => {
                const initialSubmissionParameter =
                  initialSubmissionTimeParams &&
                  initialSubmissionTimeParams.find(
                    (param) => param.name === name
                  );
                return (
                  initialSubmissionParameter &&
                  value !== initialSubmissionParameter.value
                );
              });
            }

            messageHandler.postMessage({
              command: 'run-action',
              args: {
                [Property.JOB_RUN_NAME]:
                  !isShowAllOptionsToggled || jobRunName.trim() === ''
                    ? null
                    : jobRunName,
                [Property.JOB_RUN_DESCRIPTION]:
                  !isShowAllOptionsToggled || jobRunDescription.trim() === ''
                    ? null
                    : jobRunDescription,
                [Property.APP_BUNDLE_FILE_PATH]:
                  appBundleFilePath.trim() === '' ? null : appBundleFilePath,
                [Property.JOB_CONFIG_OVERLAY]: jobConfigOverlay
              }
            });
          }
        }}
        secondaryBtn={{
          label: 'Cancel',
          isValid: true,
          onClick: () => messageHandler.postMessage({ command: 'close-panel' })
        }}
      />
    );
  };

  return (
    <div className="bx--grid main-container">
      <div className="bx--row main-container__row">
        <div className="bx--col-lg-10 bx--col-md-6">
          <div className="main-container__form-item">
            <Toggle
              className="main-container__toggle"
              id="cpd-job-toggle"
              labelA="Show all options"
              labelB="Showing all options"
              toggled={isShowAllOptionsToggled}
              onToggle={() =>
                dispatch({
                  type: Action.SET_IS_SHOW_ALL_OPTIONS_TOGGLED,
                  payload: !isShowAllOptionsToggled
                })
              }
            />
          </div>
          <JobRunContainer />
          <StreamsJobNameContainer />
          <AppBundleContainer messageHandler={messageHandler} />
          <SubmissionParamsContainer />
          <JobConfigOverlayContainer
            messageHandler={messageHandler}
            jobName={jobName}
          />
          {getButtonContainer()}
        </div>
      </div>
    </div>
  );
};

ConfigureRunContainer.propTypes = {
  messageHandler: PropTypes.instanceOf(MessageHandler).isRequired,
  params: PropTypes.shape({
    jobName: PropTypes.string,
    appBundle: PropTypes.shape({
      name: PropTypes.string,
      lastModified: PropTypes.string
    }),
    jobConfigurationOverlay: PropTypes.object
  }).isRequired
};

export default ConfigureRunContainer;
