import Button from 'carbon-components-react/es/components/Button';
import CodeSnippet from 'carbon-components-react/es/components/CodeSnippet';
import { FileUploaderItem } from 'carbon-components-react/es/components/FileUploader';
import FormGroup from 'carbon-components-react/es/components/FormGroup';
import FormLabel from 'carbon-components-react/es/components/FormLabel';
import Link from 'carbon-components-react/es/components/Link';
import _cloneDeep from 'lodash/cloneDeep';
import PropTypes from 'prop-types';
import React from 'react';
import HelpTooltip from '../../../../commonComponents/HelpTooltip';
import MessageHandler from '../../../../message.ts';
import { useDispatch, useState } from '../../context';
import { Action } from '../../reducers/editReducer';

const JOB_CONFIG_OVERLAY_LABEL = 'Job configuration overlay';
const JOB_CONFIG_OVERLAY_HELP_TEXT = `A job configuration overlay is a JSON
  object that contains name-value pairs for job configuration parameters. You
  can use a job configuration overlay to define, save, and distribute the
  submission-time configuration or to change the configuration of a running job.`;
const JOB_CONFIG_OVERLAY_HELP_URL =
  'https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/dev_job_configuration_overlays.html';

const JobConfigOverlayContainer = ({ messageHandler }) => {
  const dispatch = useDispatch();
  const {
    isShowAllOptionsToggled,
    jobDefinitionName,
    appBundleFilePath,
    jobConfigOverlay,
    selectedJobConfigOverlayFile
  } = useState();

  const getFormattedJobConfigOverlay = () =>
    JSON.stringify(jobConfigOverlay, null, 2);

  const importFile = async () => {
    const selectedFile = await messageHandler.postMessage({
      command: 'import-job-config-overlay-file',
      args: { filters: { JSON: ['json'] } }
    });
    if (selectedFile) {
      dispatch({
        type: Action.SET_SELECTED_JOB_CONFIG_OVERLAY_FILE,
        payload: selectedFile
      });
      if (selectedFile.json) {
        const submissionParamsFromSelectedFile = _cloneDeep(
          selectedFile.json?.jobConfigOverlays?.[0]?.jobConfig
            ?.submissionParameters
        );
        const submissionParamsFromJobConfigOverlay = _cloneDeep(
          jobConfigOverlay?.jobConfigOverlays?.[0]?.jobConfig
            ?.submissionParameters
        );

        if (!submissionParamsFromSelectedFile) {
          // Add existing submission-time parameters to job configuration overlay
          if (!selectedFile.json.jobConfigOverlays) {
            selectedFile.json.jobConfigOverlays = [];
          }
          if (!selectedFile.json.jobConfigOverlays.length) {
            selectedFile.json.jobConfigOverlays.push({});
          }
          if (!selectedFile.json.jobConfigOverlays[0].jobConfig) {
            selectedFile.json.jobConfigOverlays[0].jobConfig = {};
          }
          selectedFile.json.jobConfigOverlays[0].jobConfig.submissionParameters = submissionParamsFromJobConfigOverlay;
        } else {
          // Add missing submission-time parameters to job configuration overlay
          submissionParamsFromJobConfigOverlay.forEach((param) => {
            const matchingParam = submissionParamsFromSelectedFile.find(
              ({ name }) => name === param.name
            );
            if (!matchingParam) {
              selectedFile.json.jobConfigOverlays[0].jobConfig.submissionParameters.push(
                param
              );
            }
          });
          selectedFile.json.jobConfigOverlays[0].jobConfig.submissionParameters = selectedFile.json.jobConfigOverlays[0].jobConfig.submissionParameters.sort(
            (firstParam, secondParam) =>
              firstParam.name.localeCompare(secondParam.name)
          );
        }

        dispatch({
          type: Action.SET_JOB_CONFIG_OVERLAY,
          payload: selectedFile.json
        });
      }
    }
  };

  const exportFile = () => {
    const fileName = `${jobDefinitionName}-jobConfiguration.json`;
    messageHandler.postMessage({
      command: 'export-job-config-overlay-file',
      args: {
        appBundleFilePath,
        fileName,
        fileContent: getFormattedJobConfigOverlay(),
        fileType: { JSON: ['json'] },
        buttonLabel: 'Export'
      }
    });
  };

  if (!isShowAllOptionsToggled || !jobConfigOverlay) {
    return null;
  }

  return (
    <FormGroup
      legendText=""
      className="main-container__form-group job-config-overlay-container"
    >
      <h1 className="main-container__section-header">
        <HelpTooltip
          label={JOB_CONFIG_OVERLAY_LABEL}
          tooltipText={JOB_CONFIG_OVERLAY_HELP_TEXT}
          buttonUrl={JOB_CONFIG_OVERLAY_HELP_URL}
        />
      </h1>
      <div className="bx--btn-set main-container__form-item-inner">
        <Button kind="tertiary" size="field" onClick={importFile}>
          Import file
        </Button>
        <Button kind="tertiary" size="field" onClick={exportFile}>
          Export file
        </Button>
      </div>
      {selectedJobConfigOverlayFile && selectedJobConfigOverlayFile.error && (
        <div className="job-config-overlay-container__file-uploader-item">
          <FileUploaderItem
            errorBody={
              selectedJobConfigOverlayFile.errorLink ? (
                <span>
                  {selectedJobConfigOverlayFile.error}
                  <Link
                    href={JOB_CONFIG_OVERLAY_HELP_URL}
                    className="job-config-overlay-container__import-jco__file-uploader-item__link"
                  >
                    here
                  </Link>
                  .
                </span>
              ) : (
                selectedJobConfigOverlayFile.error
              )
            }
            errorSubject="File could not be imported. Import a different file."
            iconDescription={null}
            invalid
            name={selectedJobConfigOverlayFile.fileName}
            status="edit"
            onDelete={() => {
              dispatch({
                type: Action.SET_SELECTED_JOB_CONFIG_OVERLAY_FILE,
                payload: null
              });
            }}
          />
        </div>
      )}
      <div>
        <FormLabel>Preview</FormLabel>
        <CodeSnippet
          type="multi"
          feedback="Copied!"
          onClick={() =>
            messageHandler.postMessage({
              command: 'copy-to-clipboard',
              args: { value: getFormattedJobConfigOverlay() }
            })
          }
          className="main-container__code-snippet"
        >
          {getFormattedJobConfigOverlay()}
        </CodeSnippet>
      </div>
    </FormGroup>
  );
};

JobConfigOverlayContainer.propTypes = {
  messageHandler: PropTypes.instanceOf(MessageHandler).isRequired
};

export default JobConfigOverlayContainer;
