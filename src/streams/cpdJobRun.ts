import {
  CloudPakForDataJobType,
  CpdJob as CpdJobCommon,
  CpdJobRun as CpdJobRunCommon,
  getCloudPakForDataJob,
  getStreamsApplicationServiceInstances,
  InstanceSelector,
  refreshCloudPakForDataInfo,
  Registry,
  store
} from '@ibmstreams/common';
import * as fs from 'fs';
import { commands, Uri, window } from 'vscode';
import { BuiltInCommands, VSCode } from '../utils';
import { getStreamsExplorer } from '../views';

const APPLICATION_TRACE_LABEL = 'Application trace';
const PRODUCT_LOG = 'Product log';

/**
 * Get the Cloud Pak for Data job type
 * @param spaceId the Cloud Pak for Data space identifier
 */
const getCpdJobType = (spaceId: string): CloudPakForDataJobType =>
  spaceId ? CloudPakForDataJobType.Space : CloudPakForDataJobType.Project;

/**
 * Refresh the Cloud Pak for Data job and Streams Explorer
 * @param connectionId the target Streams instance connection identifier
 * @param jobType whether the job is in a space or project
 * @param spaceOrProjectId the Cloud Pak for Data space or project identifier
 * @param jobId the Cloud Pak for Data job identifier
 */
const refreshJob = async (
  connectionId: string,
  jobType: CloudPakForDataJobType,
  spaceOrProjectId: string,
  jobId: string
): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      await store.dispatch(
        getCloudPakForDataJob(connectionId, jobType, spaceOrProjectId, jobId)
      );
      getStreamsExplorer().refresh();
      resolve();
    }, 3000);
  });
};

/**
 * Handle download log action
 * @param instanceName the target instance name
 * @param jobName the Cloud Pak for Data job name
 * @param jobRunName the Cloud Pak for Data job run name
 * @param jobRunLogName the Cloud Pak for Data job run log name
 * @param jobRunLogType the Cloud Pak for Data job run log type
 * @param jobRunLogData the Cloud Pak for Data job run log data
 */
const handleDownloadLog = async (
  instanceName: string,
  jobName: string,
  jobRunName: string,
  jobRunLogName: string,
  jobRunLogType: string,
  jobRunLogData: any
): Promise<void> => {
  if (jobRunLogData) {
    const uri = await VSCode.showSaveDialog('Save', null, jobRunLogName, null);
    if (uri) {
      const logFilePath = uri.fsPath;
      if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
      }
      fs.writeFileSync(logFilePath, jobRunLogData);
      Registry.getDefaultMessageHandler().logInfo(
        `The ${jobRunLogType.toLowerCase()} for the job run ${jobRunName} for the job definition ${jobName} in the Streams instance ${instanceName} was successfully downloaded.`,
        {
          detail: logFilePath,
          notificationButtons: [
            {
              label: 'Copy Path',
              callbackFn: async (): Promise<void> =>
                VSCode.copyToClipboard(logFilePath)
            }
          ]
        }
      );

      // Open if .log file
      if (jobRunLogName.endsWith('.log')) {
        commands.executeCommand(BuiltInCommands.Open, Uri.file(logFilePath));
      }
    }
  }
};

/**
 * Get the URL for the Cloud Pak for Data job run details page
 * @param connectionId the target Streams instance connection identifier
 * @param spaceId the Cloud Pak for Data space identifier
 * @param projectId the Cloud Pak for Data project identifier
 * @param jobId the Cloud Pak for Data job identifier
 * @param jobRunId the Cloud Pak for Data job run identifier
 */
const getCpdJobRunDetailsPageUrl = (
  connectionId: string,
  spaceId: string,
  projectId: string,
  jobId: string,
  jobRunId: string
): string => {
  const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
    store.getState(),
    connectionId
  );
  const id =
    getCpdJobType(spaceId) === CloudPakForDataJobType.Space
      ? `space_id=${spaceId}`
      : `project_id=${projectId}`;
  return `${cpdUrl}/streams/webpage/#/streamsJobRunDetails?job_id=${jobId}&jobrun_id=${jobRunId}&${id}&context=icp4data`;
};

/**
 * Cancel a Cloud Pak for Data job run
 * @param instance the target Streams instance
 * @param spaceId the Cloud Pak for Data space identifier
 * @param projectId the Cloud Pak for Data project identifier
 * @param jobId the Cloud Pak for Data job identifier
 * @param jobName the Cloud Pak for Data job name
 * @param jobRunId the Cloud Pak for Data job run identifier
 * @param jobRunName the Cloud Pak for Data job run name
 */
const cancelJobRun = async (
  instance: any,
  spaceId: string,
  projectId: string,
  jobId: string,
  jobName: string,
  jobRunId: string,
  jobRunName: string
): Promise<void> => {
  const { connectionId } = instance;
  const instanceName = InstanceSelector.selectInstanceName(
    store.getState(),
    connectionId
  );

  const label = `Are you sure you want to cancel the job run ${jobRunName} for the job definition ${jobName} in the Streams instance ${instanceName}?`;
  const callbackFn = async (): Promise<void> => {
    const downloadPromiseArrs = await store.dispatch(
      CpdJobRunCommon.cancelRun(
        connectionId,
        getCpdJobType(spaceId),
        spaceId || projectId,
        jobId,
        jobName,
        jobRunId,
        jobRunName,
        refreshJob
      )
    );

    if (downloadPromiseArrs && downloadPromiseArrs.length) {
      const instanceName = InstanceSelector.selectInstanceName(
        store.getState(),
        connectionId
      );

      await downloadPromiseArrs.map(async (downloadPromiseArr) => {
        const [
          jobRunLogName,
          jobRunLogType,
          logData
        ]: any[] = await Promise.all(downloadPromiseArr);
        await handleDownloadLog(
          instanceName,
          jobName,
          jobRunName,
          jobRunLogName,
          jobRunLogType,
          logData
        );
      });
    }

    await store.dispatch(
      getStreamsApplicationServiceInstances(connectionId, null)
    );
    await refreshJob(
      connectionId,
      getCpdJobType(spaceId),
      spaceId || projectId,
      jobId
    );
  };
  return VSCode.showConfirmationDialog(label, callbackFn);
};

/**
 * Delete a Cloud Pak for Data job run
 * @param instance the target Streams instance
 * @param spaceId the Cloud Pak for Data space identifier
 * @param projectId the Cloud Pak for Data project identifier
 * @param jobId the Cloud Pak for Data job identifier
 * @param jobName the Cloud Pak for Data job name
 * @param jobRunId the Cloud Pak for Data job run identifier
 * @param jobRunName the Cloud Pak for Data job run name
 */
const deleteJobRun = async (
  instance: any,
  spaceId: string,
  projectId: string,
  jobId: string,
  jobName: string,
  jobRunId: string,
  jobRunName: string
): Promise<void> => {
  const { connectionId } = instance;
  const instanceName = InstanceSelector.selectInstanceName(
    store.getState(),
    connectionId
  );

  const label = `Are you sure you want to delete the job run ${jobRunName} for the job definition ${jobName} in the Streams instance ${instanceName}?`;
  const callbackFn = async (): Promise<void> => {
    await store.dispatch(
      CpdJobRunCommon.deleteRun(
        connectionId,
        getCpdJobType(spaceId),
        spaceId || projectId,
        jobId,
        jobName,
        jobRunId,
        jobRunName
      )
    );

    await refreshJob(
      connectionId,
      getCpdJobType(spaceId),
      spaceId || projectId,
      jobId
    );
  };
  return VSCode.showConfirmationDialog(label, callbackFn);
};

/**
 * Create log snapshot for a Cloud Pak for Data job run
 * @param connectionId the target Streams instance connection identifier
 * @param spaceId the Cloud Pak for Data space identifier
 * @param projectId the Cloud Pak for Data project identifier
 * @param jobId the Cloud Pak for Data job identifier
 * @param jobName the Cloud Pak for Data job name
 * @param jobRunId the Cloud Pak for Data job run identifier
 * @param jobRunName the Cloud Pak for Data job run name
 */
const createJobRunLogSnapshot = async (
  connectionId: any,
  spaceId: string,
  projectId: string,
  jobId: string,
  jobName: string,
  jobRunId: string,
  jobRunName: string
): Promise<void> => {
  const downloadPromiseArrs = await store.dispatch(
    CpdJobRunCommon.createRunLogSnapshot(
      connectionId,
      getCpdJobType(spaceId),
      spaceId || projectId,
      jobId,
      jobName,
      jobRunId,
      jobRunName,
      refreshJob
    )
  );

  if (downloadPromiseArrs && downloadPromiseArrs.length) {
    const instanceName = InstanceSelector.selectInstanceName(
      store.getState(),
      connectionId
    );

    await downloadPromiseArrs.map(async (downloadPromiseArr) => {
      const [jobRunLogName, jobRunLogType, logData]: any[] = await Promise.all(
        downloadPromiseArr
      );
      await handleDownloadLog(
        instanceName,
        jobName,
        jobRunName,
        jobRunLogName,
        jobRunLogType,
        logData
      );
    });
  }
};

/**
 * Delete logs for a Cloud Pak for Data job run
 * @param connectionId the target Streams instance connection identifier
 * @param spaceId the Cloud Pak for Data space identifier
 * @param project the Cloud Pak for Data project identifier
 * @param jobId the Cloud Pak for Data job identifier
 * @param jobName the Cloud Pak for Data job name
 * @param jobRunId the Cloud Pak for Data job run identifier
 * @param jobRunName the Cloud Pak for Data job run name
 */
const deleteJobRunLogs = async (
  connectionId: any,
  spaceId: string,
  projectId: string,
  jobId: string,
  jobName: string,
  jobRunId: string,
  jobRunName: string
): Promise<void> => {
  const instanceName = InstanceSelector.selectInstanceName(
    store.getState(),
    connectionId
  );

  const logItems = InstanceSelector.selectCloudPakForDataJobRunLogsInSpace(
    store.getState(),
    connectionId,
    getCpdJobType(spaceId),
    spaceId || projectId,
    jobId,
    jobRunId
  )
    .slice()
    .sort(
      (
        { last_modified: firstRunLastModified }: { last_modified: string },
        { last_modified: secondRunLastModified }: { last_modified: string }
      ) =>
        new Date(secondRunLastModified).getTime() -
        new Date(firstRunLastModified).getTime()
    )
    .map(
      ({ last_modified, path }: { last_modified: string; path: string }) => ({
        label: path.endsWith('.tgz') ? APPLICATION_TRACE_LABEL : PRODUCT_LOG,
        description: new Date(last_modified).toLocaleString(),
        path
      })
    );
  if (logItems && logItems.length) {
    const selectedItems = await window.showQuickPick(logItems, {
      canPickMany: true,
      ignoreFocusOut: true,
      placeHolder: `Select one or more logs to delete for the job run ${jobRunName} for the job definition ${jobName} in the Streams instance ${instanceName}`
    });
    if (selectedItems && selectedItems.length) {
      await Promise.all(
        selectedItems.map(({ label, path }: { label: string; path: string }) =>
          store.dispatch(
            CpdJobRunCommon.deleteRunLog(
              connectionId,
              getCpdJobType(spaceId),
              spaceId || projectId,
              jobId,
              jobName,
              jobRunId,
              jobRunName,
              path,
              path.split('/').pop(),
              label
            )
          )
        )
      );
      await refreshJob(
        connectionId,
        getCpdJobType(spaceId),
        spaceId || projectId,
        jobId
      );
    }
  }
};

/**
 * Delete log for a Cloud Pak for Data job run
 * @param connectionId the target Streams instance connection identifier
 * @param spaceId the Cloud Pak for Data space identifier
 * @param projectId the Cloud Pak for Data project identifier
 * @param jobId the Cloud Pak for Data job identifier
 * @param jobName the Cloud Pak for Data job name
 * @param jobRunId the Cloud Pak for Data job run identifier
 * @param jobRunName the Cloud Pak for Data job run name
 * @param jobRunLogPath the path to the Cloud Pak for Data job run log
 * @param jobRunLogName the name of the Cloud Pak for Data job run log
 * @param jobRunLogType the type of the Cloud Pak for Data job run log
 */
const deleteJobRunLog = async (
  connectionId: any,
  spaceId: string,
  projectId: string,
  jobId: string,
  jobName: string,
  jobRunId: string,
  jobRunName: string,
  jobRunLogPath: string,
  jobRunLogName: string,
  jobRunLogType: string
): Promise<void> => {
  const instanceName = InstanceSelector.selectInstanceName(
    store.getState(),
    connectionId
  );

  const label = `Are you sure you want to delete the ${jobRunLogType.toLowerCase()} ${jobRunLogName} for the job run ${jobRunName} for the job definition ${jobName} in the Streams instance ${instanceName}?`;
  const callbackFn = async (): Promise<void> => {
    await store.dispatch(
      CpdJobRunCommon.deleteRunLog(
        connectionId,
        getCpdJobType(spaceId),
        spaceId || projectId,
        jobId,
        jobName,
        jobRunId,
        jobRunName,
        jobRunLogPath,
        jobRunLogName,
        jobRunLogType
      )
    );

    await refreshJob(
      connectionId,
      getCpdJobType(spaceId),
      spaceId || projectId,
      jobId
    );
  };
  return VSCode.showConfirmationDialog(label, callbackFn);
};

/**
 * Download log for a Cloud Pak for Data job run
 * @param connectionId the target Streams instance connection identifier
 * @param spaceId the Cloud Pak for Data space identifier
 * @param projectId the Cloud Pak for Data project identifier
 * @param jobId the Cloud Pak for Data job identifier
 * @param jobName the Cloud Pak for Data job name
 * @param jobRunId the Cloud Pak for Data job run identifier
 * @param jobRunName the Cloud Pak for Data job run name
 * @param jobRunLogPath the path to the Cloud Pak for Data job run log
 * @param jobRunLogName the name of the Cloud Pak for Data job run log
 * @param jobRunLogType the type of the Cloud Pak for Data job run log
 */
const downloadJobRunLog = async (
  connectionId: any,
  spaceId: string,
  projectId: string,
  jobId: string,
  jobName: string,
  jobRunId: string,
  jobRunName: string,
  jobRunLogPath: string,
  jobRunLogName: string,
  jobRunLogType: string
): Promise<void> => {
  const instanceName = InstanceSelector.selectInstanceName(
    store.getState(),
    connectionId
  );
  try {
    const logData = await store.dispatch(
      CpdJobRunCommon.downloadRunLog(
        connectionId,
        getCpdJobType(spaceId),
        spaceId || projectId,
        jobId,
        jobName,
        jobRunId,
        jobRunName,
        jobRunLogPath,
        jobRunLogType
      )
    );
    await handleDownloadLog(
      instanceName,
      jobName,
      jobRunName,
      jobRunLogName,
      jobRunLogType,
      logData
    );
  } catch (err) {
    Registry.getDefaultMessageHandler().logError(
      `Failed to download the ${jobRunLogType.toLowerCase()} for the job run ${jobRunName} for the job definition ${jobName} in the Streams instance ${instanceName}.`,
      CpdJobCommon.getFailureNotificationOptions()
    );
    return Promise.reject(err);
  }
};

/**
 * Handle an error
 * @param err the error object
 */
const handleError = (err: any): void => {
  const message = err?.response?.data?.message;
  const reason = err?.response?.data?.reason;
  let errorMsg = '';
  if (message) {
    errorMsg += message;
  }
  if (reason) {
    errorMsg += errorMsg === '' ? reason : `\n${reason}`;
  }
  Registry.getDefaultMessageHandler().logError(errorMsg, {
    detail: err.response || err.message || err,
    stack: err.response || err.stack
  });
};

/**
 * Helper methods for Cloud Pak for Data job runs
 */
const CpdJobRun = {
  getCpdJobRunDetailsPageUrl,
  cancelJobRun,
  deleteJobRun,
  createJobRunLogSnapshot,
  deleteJobRunLogs,
  deleteJobRunLog,
  downloadJobRunLog,
  handleError
};

export default CpdJobRun;
