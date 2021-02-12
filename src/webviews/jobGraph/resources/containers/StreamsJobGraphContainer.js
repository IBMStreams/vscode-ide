import PropTypes from 'prop-types';
import React, { Component } from 'react';
import StreamsJobGraph from '@ibmstreams/graph';
import TitleHeader from '../components/TitleHeader/TitleHeader';
import LoadingIcon from '../icons/LoadingIcon.svg';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';
import StreamsUtils from '../utils';

const messageHandler = new MessageHandler();

export default class StreamsJobGraphContainer extends Component {
  constructor(props) {
    super(props);

    const { params } = this.props;
    const { instanceName, jobId } = params;

    // initial state
    this.state = {
      instanceName,
      jobId: jobId || null
    };

    this.jobGraphRef = React.createRef();

    this.handleJobSelected = this.handleJobSelected.bind(this);
    this.getJobMetricsSnapshot = this.getJobMetricsSnapshot.bind(this);
    this.getJobSnapshot = this.getJobSnapshot.bind(this);
    this.getStreamsJobsDetails = this.getStreamsJobsDetails.bind(this);
    this.deleteJob = this.deleteJob.bind(this);
    this.getExportedStreams = this.getExportedStreams.bind(this);
    this.callStreamsRestAPI = this.callStreamsRestAPI.bind(this);
    this.setDynamicViews = this.setDynamicViews.bind(this);
    this.getDynamicViews = this.getDynamicViews.bind(this);
    this.openCpdUrl = this.openCpdUrl.bind(this);
    this.sendData = this.sendData.bind(this);
    this.receiveData = this.receiveData.bind(this);
    this.saveFile = this.saveFile.bind(this);
    this.getHeader = this.getHeader.bind(this);
  }

  componentDidMount() {
    const applyStylingCallbackFn = this.jobGraphRef.current.applyStyling;
    this.themeHandler = new ThemeHandler(applyStylingCallbackFn);
  }

  handleJobSelected(jobId, jobName) {
    if (jobId && jobName) {
      messageHandler.postMessage({
        command: 'job-selected',
        args: { jobId, jobName }
      });
      this.setState({ jobId });
    }
  }

  getStreamsJobs(callback) {
    StreamsUtils.getStreamsJobs((error, data) => {
      callback(error, data);
    });
  }

  getJobMetricsSnapshot(
    showingConnectedJobs,
    jobIds,
    callback,
    metricsSnapshotCount,
    includeMetricStats
  ) {
    StreamsUtils.getJobMetricsSnapshot({
      showingConnectedJobs,
      jobIds,
      callback,
      metricsSnapshotCount,
      includeMetricStats
    });
  }

  getJobSnapshot(
    showingConnectedJobs,
    jobIds,
    callback,
    jobDetailsSnapshotCount,
    includeStaticDetails
  ) {
    StreamsUtils.getJobSnapshot({
      showingConnectedJobs,
      jobIds,
      includeStaticDetails,
      callback,
      jobDetailsSnapshotCount
    });
  }

  getStreamsJobsDetails({ jobIds, callback }) {
    StreamsUtils.getStreamsJobsDetails({
      jobIds,
      callback
    });
  }

  deleteJob(jobId, callback) {
    const { instanceId } = this.state;
    StreamsUtils.deleteJob(instanceId, jobId, callback);
  }

  getExportedStreams(callback) {
    StreamsUtils.getExportedStreams(callback);
  }

  getDynamicViews(storedViewId) {
    return messageHandler.postMessage({
      command: 'get-dynamic-views',
      args: { key: storedViewId }
    });
  }

  setDynamicViews(storedViewId, views) {
    return messageHandler.postMessage({
      command: 'set-dynamic-views',
      args: { key: storedViewId, value: JSON.stringify([...views]) }
    });
  }

  openCpdUrl(params) {
    return messageHandler.postMessage({
      command: 'open-cpd-url',
      args: params
    });
  }

  sendData(params) {
    return messageHandler.postMessage({
      command: 'send-data',
      args: params
    });
  }

  receiveData(params) {
    return messageHandler.postMessage({
      command: 'receive-data',
      args: params
    });
  }

  saveFile(fileName, fileContent, fileType, buttonLabel) {
    messageHandler.postMessage({
      command: 'save-file',
      args: {
        fileName,
        fileContent,
        fileType,
        buttonLabel
      }
    });
  }

  callStreamsRestAPI(endpoint, callback, reserved, options) {
    return StreamsUtils.callStreamsRestAPI(
      endpoint,
      callback,
      reserved,
      options
    );
  }

  getDefaultEmptyCanvasContent() {
    const { jobId } = this.state;
    return jobId ? (
      <div className="job-graph-container__loading-icon">
        <div
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ width: '10.5rem', height: '10.5rem' }}>
            <img src={LoadingIcon} alt="Loading..." />
          </div>
        </div>
      </div>
    ) : (
      <div className="job-graph-container__empty-canvas-message">
        Select a Streams job from the dropdown above to view a graph.
      </div>
    );
  }

  getJobActionCanvasMessage() {
    return (
      <div className="job-graph-container__job-action-canvas-message">
        Select a Streams job from the dropdown above to view a different graph.
      </div>
    );
  }

  getHeader(title, status, lastUpdatedTimestamp, showJobGraphModal) {
    const { jobId } = this.state;
    return (
      <TitleHeader
        title={title}
        status={status}
        lastUpdatedTimestamp={lastUpdatedTimestamp}
        showJobGraphModal={showJobGraphModal}
        getStreamsJobs={this.getStreamsJobs}
        selectedJobId={jobId}
        handleJobSelected={this.handleJobSelected}
      />
    );
  }

  render() {
    const { instanceName, jobId } = this.state;

    const streamsJobGraph = (
      <StreamsJobGraph
        ref={this.jobGraphRef}
        key={jobId}
        jobId={jobId}
        instanceName={instanceName}
        getJobMetricsSnapshot={this.getJobMetricsSnapshot}
        getJobSnapshot={this.getJobSnapshot}
        deleteJob={this.deleteJob}
        getStreamsJobsDetails={this.getStreamsJobsDetails}
        getExportedStreams={this.getExportedStreams}
        callStreamsRestAPI={this.callStreamsRestAPI}
        getDynamicViews={this.getDynamicViews}
        setDynamicViews={this.setDynamicViews}
        openCpdUrl={this.openCpdUrl}
        sendData={this.sendData}
        receiveData={this.receiveData}
        saveFile={this.saveFile}
        defaultEmptyCanvasContent={this.getDefaultEmptyCanvasContent()}
        jobActionCanvasMessage={this.getJobActionCanvasMessage()}
      >
        {this.getHeader}
      </StreamsJobGraph>
    );

    return <div className="job-graph-container">{streamsJobGraph}</div>;
  }
}

StreamsJobGraphContainer.propTypes = {
  params: PropTypes.shape({
    instanceName: PropTypes.string.isRequired,
    jobId: PropTypes.string
  }).isRequired
};
