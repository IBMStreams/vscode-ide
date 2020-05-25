import ErrorFilled16 from '@carbon/icons-react/es/error--filled/16';
import HelpFilled16 from '@carbon/icons-react/es/help--filled/16';
import InfoIcon16 from '@carbon/icons-react/es/information/16';
import WarningAltFilled16 from '@carbon/icons-react/es/warning--alt--filled/16';
import Button from 'carbon-components-react/es/components/Button';
import Dropdown from 'carbon-components-react/es/components/Dropdown';
import Loading from 'carbon-components-react/es/components/Loading';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import RunningJobIcon from '../../icons/icon--running--job.svg';

const statusIcons = {
  OK: (
    <img
      src={RunningJobIcon}
      className="title-header__status-icon"
      alt="running"
      title="Running"
    />
  ),
  ERROR: (
    <ErrorFilled16
      className="title-header__status-icon title-header__status-icon-red"
    >
      <title>Error</title>
    </ErrorFilled16>
  ),
  WARNING: (
    <WarningAltFilled16
      className="title-header__status-icon title-header__status-icon-yellow"
      title="Warning"
    >
      <title>Warning</title>
    </WarningAltFilled16>
  ),
  UNKNOWN: (
    <HelpFilled16
      className="title-header__status-icon title-header__status-icon-faded"
    >
      <title>Unknown</title>
    </HelpFilled16>
  ),
  LOADING: (
    <Loading
      description="Loading..."
      withOverlay={false}
      className="title-header__status-icon"
    />
  )
};

export default class TitleHeader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      jobs: [],
      isLoadingJobs: true,
      jobsError: false
    };

    this.setStreamsJobs = this.setStreamsJobs.bind(this);
    this.getTitle = this.getTitle.bind(this);
    this.onDropdownChange = this.onDropdownChange.bind(this);
  }

  componentDidMount() {
    const { getStreamsJobs } = this.props;
    getStreamsJobs(this.setStreamsJobs);
  }

  setStreamsJobs(error, data) {
    const newState = { isLoadingJobs: false };
    if (error) {
      newState.jobsError = true;
    } else if (data) {
      const { jobs } = data;
      newState.jobs = jobs;
    }
    this.setState(newState);
  }

  getTitle() {
    const { status, showJobGraphModal, selectedJobId } = this.props;
    const jobsDropdownMenu = this.getJobsDropdownMenu();
    if (!selectedJobId) {
      return jobsDropdownMenu;
    }

    if (status) {
      return showJobGraphModal
        ? (
          <>
            {jobsDropdownMenu}
            <Button
              hasIconOnly
              type="button"
              kind="ghost"
              renderIcon={InfoIcon16}
              iconDescription="Show job details"
              tabIndex={0}
              onClick={() => showJobGraphModal()}
              className="title-header__icon-button"
            />
            {statusIcons[status]}
          </>
        )
        : jobsDropdownMenu;
    }
  }

  getJobsDropdownMenu() {
    const { jobs, isLoadingJobs, jobsError } = this.state;
    const { getStreamsJobs, selectedJobId } = this.props;
    let placeholder = 'Select a Streams job';
    let dropdownItems = [];
    let selectedDropdownItem = null;
    if (jobsError) {
      placeholder = 'Error loading Streams jobs';
    } else if (isLoadingJobs) {
      placeholder = 'Loading jobs...';
    } else {
      dropdownItems = jobs && jobs.length
        ? jobs.map((job) => ({
          id: job.id,
          text: `${job.id}: ${job.name}`,
          jobId: job.id,
          jobName: job.name
        }))
        : [{ id: 'message', text: 'There are no jobs available.' }];
      selectedDropdownItem = selectedJobId
        ? (dropdownItems.find((dropdownItem) => dropdownItem.jobId === selectedJobId) || null)
        : null;
    }
    return (
      <Dropdown
        id="streams-jobs-dropdown"
        titleText={null}
        label={placeholder}
        ariaLabel="Streams instances dropdown"
        selectedItem={selectedDropdownItem}
        items={dropdownItems}
        itemToString={item => (item ? item.text : '')}
        onChange={this.onDropdownChange}
        downshiftProps={{
          stateReducer: (state, changes) => {
            const { isOpen } = changes;
            if (isOpen) {
              this.setState(
                { isLoadingJobs: true, jobsError: false },
                () => { getStreamsJobs(this.setStreamsJobs); }
              );
            }
            return changes;
          }
        }}
        className="title-header__job-dropdown"
      />
    );
  }

  onDropdownChange(dropdownItem) {
    const { handleJobSelected } = this.props;
    const { selectedItem: { id, jobId, jobName } } = dropdownItem;
    if (id === 'message') {
      return;
    }
    handleJobSelected(jobId || null, jobName || null);
  }

  render() {
    const buttonsToRender = [];
    const { lastUpdatedTimestamp } = this.props;

    return (
      <div className="title-header">
        <div className="title-header__left">
          {this.getTitle()}
        </div>
        <div className="title-header__right">
          {lastUpdatedTimestamp && (
            <div className="title-header__text">
              {lastUpdatedTimestamp}
            </div>
          )}
          {buttonsToRender}
        </div>
      </div>
    );
  }
}

TitleHeader.defaultProps = {
  status: null,
  lastUpdatedTimestamp: null,
  showJobGraphModal: null,
  selectedJobId: null
};

TitleHeader.propTypes = {
  status: PropTypes.string,
  lastUpdatedTimestamp: PropTypes.string,
  showJobGraphModal: PropTypes.func,
  getStreamsJobs: PropTypes.func.isRequired,
  handleJobSelected: PropTypes.func.isRequired,
  selectedJobId: PropTypes.string
};
