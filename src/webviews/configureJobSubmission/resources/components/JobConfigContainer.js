import Dropdown from 'carbon-components-react/es/components/Dropdown';
import TextInput from 'carbon-components-react/es/components/TextInput';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import _find from 'lodash/find';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../message.ts';
import JobConfigOverlayUtils from '../job-config-overlay-utils';

export default class JobConfigContainer extends Component {
  constructor(props) {
    super(props);

    const { jobGroups } = this.props;

    this.state = {
      jobGroups,
      isLoadingJobGroups: false
    };

    this.messageHandler = new MessageHandler();
  }

  getHelpTooltip = (label, tooltipText) => {
    return (
      <Tooltip
        triggerText={label}
        iconDescription={label}
        direction="right"
        tabIndex={0}
        className="job-config-container__help-tooltip"
      >
        {tooltipText}
      </Tooltip>
    );
  }

  getJobGroups = () => {
    const { jobGroups } = this.state;
    const jobGroupsOptions = jobGroups.map((jobGroup) => {
      const { name } = jobGroup;
      return { id: name, text: name, value: name };
    });
    return jobGroupsOptions;
  }

  setJobGroups = (jobGroups) => {
    const newState = { isLoadingJobGroups: false };
    if (jobGroups) {
      newState.jobGroups = jobGroups;
    }
    this.setState(newState);
  }

  render() {
    const { isLoadingJobGroups } = this.state;
    const {
      jobConfig, handleJobConfigUpdate, handleTracingUpdate, handleJobGroupConfigUpdate
    } = this.props;
    const jobName = JobConfigOverlayUtils.getJobName(jobConfig) || '';
    const jobGroup = JobConfigOverlayUtils.getJobGroup(jobConfig) || 'default';
    const dataDirectory = JobConfigOverlayUtils.getDataDirectory(jobConfig) || '';
    const regex = RegExp(/[\^!#$%&'*+,/;<>=?@[\]`{|}~()\s\u0000-\u0019\u007F-\u009F\ud800-\uF8FF\uFFF0-\uFFFF]/);
    const jobGroupsOptions = this.getJobGroups();
    const findJobGroup = jobGroupsOptions.find(group => group.text === jobGroup);
    let tracing = JobConfigOverlayUtils.getTracing(jobConfig);
    tracing = _find(traceOptions, ['text', tracing]);
    let jobNameIsInvalid = (jobName && regex.test(jobName)) || false;
    let jobNameInvalidText = `The name must contain alphanumeric characters.
      You cannot use the following alphanumeric characters: ^!#$%&'*+,/;<>=?@[]\`{|}~().
      You also cannot use the following Unicode and hexadecimal characters:
      u0000; u0001-u001F; u007F-u009F; ud800-uF8FF; uFFF0-uFFFF; x{10000}-x{10FFFF}.`;
    if (jobName && jobName.length > 1024) {
      jobNameIsInvalid = true;
      jobNameInvalidText = 'The name must not exceed 1,024 characters.';
    }

    let dropdownLabel = 'Select a job group';
    let dropdownItems = [];
    let selectedDropdownItem = null;
    if (isLoadingJobGroups) {
      dropdownLabel = 'Loading jobs groups...';
    } else {
      dropdownItems = jobGroupsOptions;
      selectedDropdownItem = findJobGroup || jobGroupsOptions[0];
    }

    return (
      <>
        <div className="job-config-container__config-input">
          <TextInput
            type="text"
            id="jobName"
            labelText={this.getHelpTooltip('Job name', 'The name that is assigned to the job.')}
            invalid={jobNameIsInvalid}
            invalidText={jobNameInvalidText}
            value={jobName}
            onChange={handleJobConfigUpdate}
          />
        </div>
        <div className="job-config-container__config-input">
          <Dropdown
            id="jobGroup"
            titleText={this.getHelpTooltip('Job group', 'The job group to use to control the permissions for the submitted job.')}
            label={dropdownLabel}
            ariaLabel="Job group dropdown"
            selectedItem={selectedDropdownItem}
            items={dropdownItems}
            itemToString={item => (item ? item.text : '')}
            onChange={handleJobGroupConfigUpdate}
            downshiftProps={{
              stateReducer: (state, changes) => {
                const { isOpen } = changes;
                if (isOpen) {
                  this.setState(
                    { isLoadingJobGroups: true },
                    async () => {
                      const jobGroups = await this.messageHandler.postMessage({ command: 'get-job-groups' });
                      this.setJobGroups(jobGroups);
                    }
                  );
                }
                return changes;
              }
            }}
          />
        </div>
        <div className="job-config-container__config-input">
          <Dropdown
            id="tracing"
            titleText={this.getHelpTooltip('Tracing', 'Specifies the trace setting for the PEs.')}
            label="Tracing"
            ariaLabel="Tracing dropdown"
            selectedItem={tracing || traceOptions.find((option) => option.id === 'error')}
            items={traceOptions}
            itemToString={item => (item ? item.text : '')}
            onChange={handleTracingUpdate}
          />
        </div>
        <div className="job-config-container__config-input">
          <TextInput
            type="text"
            id="dataDirectory"
            labelText={this.getHelpTooltip('Data directory', 'Specifies the location of the data directory.')}
            value={dataDirectory}
            onChange={handleJobConfigUpdate}
          />
        </div>
      </>
    );
  }
}

const traceOptions = [
  { id: 'error', text: 'error', value: 'error' },
  { id: 'warn', text: 'warn', value: 'warn' },
  { id: 'info', text: 'info', value: 'info' },
  { id: 'debug', text: 'debug', value: 'debug' },
  { id: 'trace', text: 'trace', value: 'trace' }
];

JobConfigContainer.propTypes = {
  jobConfig: PropTypes.shape({
    jobConfigOverlays: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  jobGroups: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleJobConfigUpdate: PropTypes.func.isRequired,
  handleJobGroupConfigUpdate: PropTypes.func.isRequired,
  handleTracingUpdate: PropTypes.func.isRequired
};
