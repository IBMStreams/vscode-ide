import Accordion from 'carbon-components-react/es/components/Accordion';
import AccordionItem from 'carbon-components-react/es/components/AccordionItem';
import Button from 'carbon-components-react/es/components/Button';
import { FileUploaderButton } from 'carbon-components-react/es/components/FileUploader';
import _findIndex from 'lodash/findIndex';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';
import JobConfigOverlayUtils from '../job-config-overlay-utils';
import JobConfigContainer from './JobConfigContainer';
import SubmitParamsContainer from './SubmitParamsContainer';

export default class SubmitJobContainer extends Component {
  constructor(props) {
    super(props);

    const { params: { submissionTimeParameters } } = this.props;
    const submissionParameters = [];
    submissionTimeParameters.forEach((param) => {
      const strippedDefaultValue = param.defaultValue ? param.defaultValue.replace(/^"|"$|^\[|\]$/g, '') : '';
      submissionParameters.push({ name: `${param.compositeName}.${param.name}`, value: strippedDefaultValue });
    });

    this.state = {
      jobConfigOverlay: {
        jobConfigOverlays: [
          {
            jobConfig: {
              submissionParameters
            }
          }
        ]
      }
    };

    this.themeHandler = new ThemeHandler();
    this.messageHandler = new MessageHandler();
    this.handleJobConfigFileChanged = this.handleJobConfigFileChanged.bind(this);
    this.handleSubmitParamUpdate = this.handleSubmitParamUpdate.bind(this);
    this.handleJobConfigUpdate = this.handleJobConfigUpdate.bind(this);
    this.handleJobGroupConfigUpdate = this.handleJobGroupConfigUpdate.bind(this);
    this.submitClicked = this.submitClicked.bind(this);
    this.handleTracingUpdate = this.handleTracingUpdate.bind(this);
    this.exportJCO = this.exportJCO.bind(this);
  }

  componentDidMount() {
    this.messageHandler.postMessage({ command: 'webview-ready' });
  }

  exportJCO() {
    const { jobConfigOverlay } = this.state;
    const { params: { name } } = this.props;
    const fileNamePrefix = JobConfigOverlayUtils.getJobName(jobConfigOverlay) || name;
    const fileName = `${fileNamePrefix}-jobConfiguration.json`;
    this.messageHandler.postMessage({
      command: 'save-file',
      args: {
        fileName,
        fileContent: JSON.stringify(jobConfigOverlay, null, 2),
        fileType: { 'Streams Job Configuration': ['json', 'jco'] },
        buttonLabel: 'Save'
      }
    });
  }

  handleJobConfigFileChanged(event) {
    const reader = new FileReader();
    const jobConfigOverlayFile = event.target.files[0];
    const { name } = jobConfigOverlayFile;
    reader.onload = () => {
      const fileContents = reader.result;
      if (fileContents) {
        try {
          const jobConfig = JSON.parse(fileContents);
          this.setState({ jobConfigOverlay: jobConfig });
        } catch (err) {
          this.messageHandler.postMessage({
            command: 'show-notification',
            args: {
              type: 'error',
              message: `An error occurred while parsing the job configuration file ${name}.\n${err}`
            }
          });
        }
      }
    };
    reader.readAsText(jobConfigOverlayFile);
  }

  handleSubmitParamUpdate(param) {
    const { jobConfigOverlay } = this.state;
    const jobConfigState = { ...jobConfigOverlay };
    const { jobConfig } = jobConfigState.jobConfigOverlays[0];
    const itemIndex = _findIndex(jobConfig.submissionParameters, ['name', param.name]);
    if (itemIndex >= 0) {
      jobConfig.submissionParameters[itemIndex].value = param.value;
      this.setState({ jobConfigOverlay: jobConfigState });
    } else {
      jobConfig.submissionParameters.push({ name: param.name, value: param.value });
      this.setState({ jobConfigOverlay: jobConfigState });
    }
  }

  handleJobConfigUpdate(event) {
    const { jobConfigOverlay } = this.state;
    const jobConfigState = { ...jobConfigOverlay };
    const { jobConfig } = jobConfigState.jobConfigOverlays[0];
    jobConfig[event.target.id] = event.target.value;
    this.setState({ jobConfigOverlay: jobConfigState });
  }

  handleJobGroupConfigUpdate(event) {
    const { jobConfigOverlay } = this.state;
    const jobConfigState = { ...jobConfigOverlay };
    const { jobConfig } = jobConfigState.jobConfigOverlays[0];
    jobConfig.jobGroup = event.selectedItem.text;
    this.setState({ jobConfigOverlay: jobConfigState });
  }

  handleTracingUpdate(event) {
    const { jobConfigOverlay } = this.state;
    const jobConfigState = { ...jobConfigOverlay };
    const { jobConfig } = jobConfigState.jobConfigOverlays[0];
    jobConfig.tracing = event.selectedItem.text;
    this.setState({ jobConfigOverlay: jobConfigState });
  }

  submitClicked() {
    const { jobConfigOverlay } = this.state;
    this.messageHandler.postMessage({
      command: 'submit-job',
      args: {
        jobConfig: jobConfigOverlay
      }
    });
    this.messageHandler.postMessage({ command: 'close-panel' });
  }

  render() {
    const { jobConfigOverlay } = this.state;
    const submitParamsFromJobConfig = JobConfigOverlayUtils.getSubmissionTimeParameters(jobConfigOverlay);
    const { params: { submissionTimeParameters, targetInstance: { streamsJobGroups } } } = this.props;
    const regex = RegExp(/[\^!#$%&'*+,/;<>=?@[\]`{|}~()\s\u0000-\u0019\u007F-\u009F\ud800-\uF8FF\uFFF0-\uFFFF]/);
    let jobNameIsInvalid = JobConfigOverlayUtils.getJobName(jobConfigOverlay);
    jobNameIsInvalid = jobNameIsInvalid && (regex.test(jobNameIsInvalid) || jobNameIsInvalid.length > 1024);
    const isDisabled = _findIndex(submitParamsFromJobConfig, (param) => param.value.trim() === '') >= 0 || jobNameIsInvalid;
    return (
      <div className="bx--grid bx--grid--no-gutter submit-job-container">
        <div className="bx--row submit-job-container__accordion">
          <div className="bx--col bx--no-gutter ">
            <Accordion>
              <AccordionItem
                open
                title={(
                  <h1 className="submit-job-container__accordion_title">
                    Submission-time parameters
                  </h1>
                )}
              >
                <SubmitParamsContainer
                  submitParamsFromJobConfig={submitParamsFromJobConfig}
                  submitParamsFromApp={submissionTimeParameters}
                  handleSubmitParamUpdate={this.handleSubmitParamUpdate}
                />
              </AccordionItem>
              <AccordionItem
                open
                title={(
                  <h1 className="submit-job-container__accordion_title">
                    Job configuration
                  </h1>
                )}
              >
                <JobConfigContainer
                  jobConfig={jobConfigOverlay}
                  handleJobConfigUpdate={this.handleJobConfigUpdate}
                  handleTracingUpdate={this.handleTracingUpdate}
                  handleJobGroupConfigUpdate={this.handleJobGroupConfigUpdate}
                  jobGroups={streamsJobGroups}
                />
              </AccordionItem>
            </Accordion>
          </div>
        </div>
        <div className="bx--row">
          <div className="bx--col bx--no-gutter bx--btn-set submit-job-container__button-container">
            <Button
              type="submit"
              kind="primary"
              disabled={isDisabled}
              onClick={this.submitClicked}
              className="submit-job-container__button-container__button"
            >
              Submit
            </Button>
            <Button
              type="reset"
              kind="secondary"
              onClick={() => this.messageHandler.postMessage({ command: 'close-panel' })}
              className="submit-job-container__button-container__button"
            >
              Cancel
            </Button>
            <FileUploaderButton
              disableLabelChanges
              labelText="Import job configuration file"
              buttonKind="tertiary"
              size="default"
              accept={['application/JSON']}
              onChange={this.handleJobConfigFileChanged}
              className="submit-job-container__button-container__button submit-job-container__button-container__file-uploader-button"
            />
            <Button
              kind="tertiary"
              onClick={this.exportJCO}
              className="submit-job-container__button-container__button"
            >
              Export job configuration file
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

SubmitJobContainer.propTypes = {
  params: PropTypes.shape({
    name: PropTypes.string.isRequired,
    submissionTimeParameters: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      compositeName: PropTypes.string.isRequired,
      defaultValue: PropTypes.string
    })).isRequired,
    targetInstance: PropTypes.shape({
      instanceName: PropTypes.string,
      streamsJobGroups: PropTypes.arrayOf(PropTypes.object)
    }).isRequired
  }).isRequired
};
