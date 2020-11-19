import Toggle from 'carbon-components-react/es/components/Toggle';
import _cloneDeep from 'lodash/cloneDeep';
import PropTypes from 'prop-types';
import React from 'react';
import ButtonContainer from '../../../../commonComponents/ButtonContainer';
import MessageHandler from '../../../../message.ts';
import { useDispatch, useState } from '../../context';
import { Action } from '../../reducers/createAndConfigureRunReducer';
import AppBundleContainer from './AppBundleContainer';
import JobConfigOverlayContainer from './JobConfigOverlayContainer';
import JobDefinitionContainer from './JobDefinitionContainer';
import JobRunContainer from './JobRunContainer';
import StreamsJobNameContainer from './StreamsJobNameContainer';
import SubmissionParamsContainer from './SubmissionParamsContainer';

export const Property = {
  CPD_SPACE: 'cpdSpace',
  JOB_DEFINITION_NAME: 'jobDefinitionName',
  JOB_DEFINITION_DESCRIPTION: 'jobDefinitionDescription',
  JOB_RUN_NAME: 'jobRunName',
  JOB_RUN_DESCRIPTION: 'jobRunDescription',
  STREAMS_JOB_NAME: 'streamsJobName',
  APP_BUNDLE_FILE_PATH: 'appBundleFilePath',
  JOB_CONFIG_OVERLAY: 'jobConfigOverlay'
};

const CreateAndConfigureRunContainer = ({
  messageHandler,
  params: { space, jobNames, bundleFilePath }
}) => {
  const dispatch = useDispatch();
  const {
    isShowAllOptionsToggled,
    jobDefinitionName,
    jobDefinitionNameError,
    jobDefinitionDescription,
    jobDefinitionDescriptionError,
    jobRunName,
    jobRunNameError,
    jobRunDescription,
    jobRunDescriptionError,
    streamsJobNameError,
    appBundleFilePath,
    appBundleFilePathError,
    isLoadingSubmissionTimeParams,
    initialSubmissionTimeParams,
    jobConfigOverlay
  } = useState();

  const getButtonContainer = () => {
    const submissionParamsFromJobConfigOverlay = _cloneDeep(
      jobConfigOverlay?.jobConfigOverlays?.[0]?.jobConfig?.submissionParameters
    );

    // True if errors, false otherwise
    const errors = {
      [Property.JOB_DEFINITION_NAME]:
        jobDefinitionName.trim() === '' || jobDefinitionNameError,
      [Property.JOB_DEFINITION_DESCRIPTION]: jobDefinitionDescriptionError,
      [Property.JOB_RUN_NAME]: jobRunNameError,
      [Property.JOB_RUN_DESCRIPTION]: jobRunDescriptionError,
      [Property.STREAMS_JOB_NAME]: streamsJobNameError,
      [Property.APP_BUNDLE_FILE_PATH]:
        appBundleFilePath.trim() === '' || appBundleFilePathError,
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
          label: 'Submit job',
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
                [Property.CPD_SPACE]: space,
                [Property.JOB_DEFINITION_NAME]: jobDefinitionName,
                [Property.JOB_DEFINITION_DESCRIPTION]:
                  !isShowAllOptionsToggled ||
                  jobDefinitionDescription.trim() === ''
                    ? null
                    : jobDefinitionDescription,
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
          <JobDefinitionContainer jobNames={jobNames} />
          <JobRunContainer />
          <StreamsJobNameContainer />
          <AppBundleContainer
            messageHandler={messageHandler}
            bundleFilePath={bundleFilePath}
          />
          <SubmissionParamsContainer />
          <JobConfigOverlayContainer messageHandler={messageHandler} />
          {getButtonContainer()}
        </div>
      </div>
    </div>
  );
};

CreateAndConfigureRunContainer.propTypes = {
  messageHandler: PropTypes.instanceOf(MessageHandler).isRequired,
  params: PropTypes.shape({
    space: PropTypes.object,
    jobNames: PropTypes.arrayOf(PropTypes.string),
    bundleFilePath: PropTypes.string
  }).isRequired
};

export default CreateAndConfigureRunContainer;
