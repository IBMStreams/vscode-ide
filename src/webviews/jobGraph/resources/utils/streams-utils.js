import _cloneDeep from 'lodash/cloneDeep';
import MessageHandler from '../../../message.ts';

// For handling messages between the extension and the webview
const messageHandler = new MessageHandler();
const messageCommandId = 'call-streams-rest-api';

async function callStreamsRestAPI(endPoint, callback, reserved = false, options = {}) {
  try {
    const response = await messageHandler.postMessage({
      command: messageCommandId,
      args: { endpoint: endPoint, reserved, options }
    });
    const {
      error, data, headers, status
    } = response;
    return callback(error, data, headers, status);
  } catch (err) {
    return callback(err);
  }
}

function getStreamsJobs(callback) {
  callStreamsRestAPI('jobs', callback);
}

async function getStreamsJobDetails(jobId, callback) {
  try {
    const jobSnapshotResponse = await messageHandler.postMessage({
      command: messageCommandId,
      args: { endpoint: `jobs/${jobId}/snapshot` }
    });
    const jobPadlResponse = await messageHandler.postMessage({
      command: messageCommandId,
      args: { endpoint: `jobs/${jobId}/padl`, reserved: true }
    });
    if (jobSnapshotResponse && jobSnapshotResponse.data && jobPadlResponse && jobPadlResponse.data) {
      const jobDetails = {
        ...jobSnapshotResponse.data,
        padl: jobPadlResponse.data
      };
      callback(null, jobDetails);
    } else {
      callback(true);
    }
  } catch (err) {
    return callback(err);
  }
}

/**
 * Gets job details for all jobs in specified instanceId
 */
async function getStreamsJobsDetails(/* instanceId, callback */ {
  jobIds,
  callback
}) {
  const padlMap = new Map();
  // eslint-disable-next-line compat/compat
  await Promise.all(jobIds.map(async (jobId) => {
    try {
      const jobPadlResponse = await messageHandler.postMessage({
        command: messageCommandId,
        args: { endpoint: `jobs/${jobId}/padl`, reserved: true }
      });
      if (jobPadlResponse && jobPadlResponse.data) {
        padlMap.set(jobId, jobPadlResponse.data);
      } else if (jobPadlResponse && jobPadlResponse.error) {
        callback(jobPadlResponse.error);
      }
    } catch (err) {
      return callback(err);
    }
  }));

  // call the REST api to get a list of job snapshots -- this contains pes information for each job
  try {
    const jobsSnapshotResponse = await messageHandler.postMessage({
      command: messageCommandId,
      args: { endpoint: `jobs/snapshot?restid=${jobIds.join()}` }
    });
    if (jobsSnapshotResponse && jobsSnapshotResponse.data) {
      const jobSnapshots = _cloneDeep(jobsSnapshotResponse.data);
      // add padl to job list
      jobSnapshots.jobs.forEach(job => {
        const padl = padlMap.get(job.id);
        if (padl) {
          job.padl = JSON.parse(JSON.stringify(padl));
        }
      });
      callback(null, jobSnapshots, jobsSnapshotResponse.headers, jobsSnapshotResponse.status);
    } if (jobsSnapshotResponse && jobsSnapshotResponse.error) {
      callback(jobsSnapshotResponse.error);
    }
  } catch (err) {
    return callback(err);
  }
}

function getJobMetricsSnapshot(
  {
    showingConnectedJobs,
    jobIds,
    callback,
    metricsSnapshotCount,
    includeMetricStats = false
  }
) {
  const jobId = !showingConnectedJobs ? `${jobIds[0]}/` : '';
  const jobList = showingConnectedJobs ? `&restid=${jobIds.join()}` : '';
  const metricsEndpoint = `jobs/${jobId}metricssnapshot?includeStatistics=${includeMetricStats}${jobList}`;
  callStreamsRestAPI(metricsEndpoint, callback);
}

function getJobSnapshot({
  showingConnectedJobs,
  jobIds,
  includeStaticDetails = false,
  callback,
  jobDetailsSnapshotCount
}) {
  const jobId = !showingConnectedJobs ? `${jobIds[0]}/` : '';
  const jobList = showingConnectedJobs ? `&restid=${jobIds.join()}` : '';
  const jobDetailsSnapshotEndpoint = `jobs/${jobId}snapshot?includeStatic=${includeStaticDetails}${jobList}`;
  callStreamsRestAPI(jobDetailsSnapshotEndpoint, callback);
}

function deleteJob(instanceId, jobId, callback) {
  const endpoint = `jobs/${jobId}`;
  const options = { method: 'delete' };
  callStreamsRestAPI(endpoint, callback, false, options);
}

function getExportedStreams(callback) {
  const exportedStreamsEndpoint = 'exportedstreams';
  const exportedStreams = [];

  callStreamsRestAPI(exportedStreamsEndpoint, async (ResponseError, ResponseData, ResponseHeaders, ResponseStatus) => {
    if (!ResponseError && ResponseStatus === 200 && ResponseData && ResponseData.exportedStreams) {
      // the response data looks like this
      /*
      {
        "exportedStreams": [
          {
            "operatorConnections": "https://syss160.pok.stglabs.ibm.com:32707/streams-rest/instances/sample-streams/tooling/jobs/5/operators/Functor_5/outputports/0/operatorconnections?required=false",
            "operatorOutputPort": "https://syss160.pok.stglabs.ibm.com:32707/streams-rest/instances/sample-streams/tooling/jobs/5/operators/Functor_5/outputports/0",
            "resourceType": "exportedStream"
          }
        ],
        "resourceType": "exportedStreamList",
        "total": 1
      }
      */
      // the actual export property is in the operatorOutputPort
      await Promise.all(ResponseData.exportedStreams.map(async (exportedStream) => {
        try {
          const {
            operatorOutputPort
          } = exportedStream;
          if (operatorOutputPort) {
            const outputPortResponse = await messageHandler.postMessage({
              command: messageCommandId,
              args: { endpoint: operatorOutputPort, reserved: false }
            });
            if (outputPortResponse && outputPortResponse.data) {
              // the response data looks like this:
              /*
                {
                  "connections": "https://syss160.pok.stglabs.ibm.com:32707/streams-rest/instances/sample-streams/tooling/jobs/5/operators/Functor_5/outputports/0/operatorconnections",
                  "export": {
                    "filterAllowed": true,
                    "name": "channel0",
                    "operator": "Export_24",
                    "type": "name"
                  },
                  "indexWithinOperator": 0,
                  ...
                }
              */
              exportedStreams.push({
                streamName: outputPortResponse.data.streamName,
                export: outputPortResponse.data.export
              });
            }
          }
        } catch (err) {
          return callback(err);
        }
      }));
      callback(null, exportedStreams);
    } else {
      callback(ResponseError, exportedStreams);
    }
  });
}

const streamsUtils = {
  getStreamsJobs,
  getStreamsJobDetails,
  getStreamsJobsDetails,
  callStreamsRestAPI,
  getJobMetricsSnapshot,
  getJobSnapshot,
  deleteJob,
  getExportedStreams
};

export default streamsUtils;
