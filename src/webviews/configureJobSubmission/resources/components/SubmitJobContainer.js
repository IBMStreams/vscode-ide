import Accordion from 'carbon-components-react/es/components/Accordion';
import AccordionItem from 'carbon-components-react/es/components/AccordionItem';
import Button from 'carbon-components-react/es/components/Button';
import { FileUploaderItem } from 'carbon-components-react/es/components/FileUploader';
import Link from 'carbon-components-react/es/components/Link';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import _cloneDeep from 'lodash/cloneDeep';
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
    const strippedDefaultValue = param.defaultValue
      ? param.defaultValue
          // Remove surrounding quotes/square brackets
          .replace(/^"|"$|^\[|\]$/g, '')
          // Unescape escape sequences
          .replace(/\\f/g, '\f') // form feed
          .replace(/\\n/g, '\n') // new line
          .replace(/\\r/g, '\r') // carriage return
          .replace(/\\t/g, '\t') // horizontal tab
          .replace(/\\v/g, '\v') // vertical tab
          .replace(/\\'/g, '\'') // single quote
          .replace(/\\"/g, '"') // double quote
          .replace(/\\/g, '\\') // backslash
      : '';
      submissionParameters.push({ name: `${param.compositeName}.${param.name}`, value: strippedDefaultValue });
    });

    this.state = {
      initialSubmissionParameters: _cloneDeep(submissionParameters),
      jobConfigOverlay: {
        jobConfigOverlays: [
          {
            jobConfig: {
              submissionParameters
            }
          }
        ]
      },
      selectedJcoFile: null
    };

    this.themeHandler = new ThemeHandler();
    this.messageHandler = new MessageHandler();
    this.handleSubmitParamUpdate = this.handleSubmitParamUpdate.bind(this);
    this.handleJobConfigUpdate = this.handleJobConfigUpdate.bind(this);
    this.handleJobGroupConfigUpdate = this.handleJobGroupConfigUpdate.bind(this);
    this.submitClicked = this.submitClicked.bind(this);
    this.handleTracingUpdate = this.handleTracingUpdate.bind(this);
    this.importJCO = this.importJCO.bind(this);
    this.exportJCO = this.exportJCO.bind(this);
  }

  componentDidMount() {
    this.messageHandler.postMessage({ command: 'webview-ready' });
  }

  async importJCO() {
    const jcoFile = await this.messageHandler.postMessage({ command: 'import-jco' });
    if (jcoFile) {
      const {
        fileName, json, error, errorLink
      } = jcoFile;
      this.setState({
        ...(json && { jobConfigOverlay: json }),
        selectedJcoFile: { name: fileName, error, errorLink }
      });
    }
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

  handleSubmitParamUpdate(param) {
    const { jobConfigOverlay } = this.state;
    const jobConfigState = { ...jobConfigOverlay };
    const { jobConfig } = jobConfigState.jobConfigOverlays[0];
    if (!jobConfig.submissionParameters) {
      jobConfig.submissionParameters = [];
    }
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
    const { initialSubmissionParameters, jobConfigOverlay } = this.state;

    // Omit parameters that are the same as the default values
    const { jobConfig } = jobConfigOverlay.jobConfigOverlays[0];
    if (!jobConfig.submissionParameters) {
      jobConfig.submissionParameters = [];
    }
    jobConfig.submissionParameters = jobConfig.submissionParameters.filter(({ name, value }) => {
      const initialSubmissionParameter = initialSubmissionParameters.find((param) => param.name === name);
      return initialSubmissionParameter && value !== initialSubmissionParameter.value;
    });

    this.messageHandler.postMessage({
      command: 'submit-job',
      args: {
        jobConfig: jobConfigOverlay
      }
    });
    this.messageHandler.postMessage({ command: 'close-panel' });
  }

  render() {
    const { initialSubmissionParameters, jobConfigOverlay, selectedJcoFile } = this.state;
    const submitParamsFromJobConfig = JobConfigOverlayUtils.getSubmissionTimeParameters(jobConfigOverlay);
    const { params: { submissionTimeParameters, targetInstance: { streamsJobGroups } } } = this.props;
    const regex = RegExp(/[\^!#$%&'*+,/;<>=?@[\]`{|}~()\s\u0000-\u0019\u007F-\u009F\ud800-\uF8FF\uFFF0-\uFFFF]/);
    let jobNameIsInvalid = JobConfigOverlayUtils.getJobName(jobConfigOverlay);
    jobNameIsInvalid = jobNameIsInvalid && (regex.test(jobNameIsInvalid) || jobNameIsInvalid.length > 1024);
    const isDisabled = _findIndex(submitParamsFromJobConfig, (param) => param.value.trim() === '') >= 0 || jobNameIsInvalid;
    const jcoDocLink = 'https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.admin.doc/doc/job_configuration_overlays.html';
    return (
      <div className="bx--grid bx--grid--no-gutter submit-job-container">
        <div className="bx--row submit-job-container__import-jco">
          <div className="bx--col bx--no-gutter">
            <div className="submit-job-container__import-jco__button-container">
              <Button
                kind="tertiary"
                size="field"
                onClick={this.importJCO}
                className="submit-job-container__import-jco__button-container__button"
              >
                Import job configuration overlay file
              </Button>
              <Tooltip
                showIcon
                direction="bottom"
                iconDescription="Learn more"
              >
                <p>
                  A job configuration overlay file is a JSON file that contains name-value pairs
                  for job configuration parameters. You can use a job configuration overlay file
                  to define, save, and distribute the submission-time configuration or to change
                  the configuration of a running job.
                </p>
                <div className="bx--tooltip__footer">
                  <Button
                    kind="primary"
                    size="small"
                    href={jcoDocLink}
                  >
                    Learn more
                  </Button>
                </div>
              </Tooltip>
            </div>
            {selectedJcoFile && (
              <div className="submit-job-container__import-jco__file-uploader-item">
                <FileUploaderItem
                  errorBody={selectedJcoFile.errorLink
                    ? (
                      <span>
                        {selectedJcoFile.error}
                        <Link
                          href={jcoDocLink}
                          className="submit-job-container__import-jco__file-uploader-item__link"
                        >
                          here
                        </Link>.
                      </span>
                    )
                    : selectedJcoFile.error
                  }
                  errorSubject="File could not be imported. Import a different file."
                  iconDescription={null}
                  invalid={!!selectedJcoFile.error}
                  name={selectedJcoFile.name}
                  status={selectedJcoFile.error ? 'edit' : 'complete'}
                  onDelete={() => { this.setState({ selectedJcoFile: null }) }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="bx--row submit-job-container__accordion">
          <div className="bx--col bx--no-gutter">
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
                  initialSubmissionParameters={initialSubmissionParameters}
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
              Submit job
            </Button>
            <Button
              type="reset"
              kind="secondary"
              onClick={() => this.messageHandler.postMessage({ command: 'close-panel' })}
              className="submit-job-container__button-container__button"
            >
              Cancel
            </Button>
            <Button
              kind="tertiary"
              onClick={this.exportJCO}
              className="submit-job-container__button-container__button-export"
            >
              Export job configuration overlay file
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
