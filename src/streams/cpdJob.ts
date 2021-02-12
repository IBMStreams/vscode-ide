import {
  CloudPakForDataJobType,
  CpdJob as CpdJobCommon,
  getCloudPakForDataJob,
  refreshCloudPakForDataInfo,
  InstanceSelector,
  Registry,
  store
} from '@ibmstreams/common';
import { commands } from 'vscode';
import { Commands } from '../commands';
import { VSCode } from '../utils';
import { getStreamsExplorer } from '../views';
import { JobAction } from '../webviews';

/**
 * Properties for a Cloud Pak for Data job edit
 */
interface CloudPakForDataJobEditProperties {
  jobDefinitionName: string;
  jobDefinitionDescription: string;
  appBundleFilePath: string;
  jobConfigOverlay: string;
}

/**
 * Properties for a Cloud Pak for Data job run
 */
interface CloudPakForDataJobRunProperties {
  jobRunName: string;
  jobRunDescription: string;
  appBundleFilePath: string;
  jobConfigOverlay: string;
}

/**
 * Properties for a Cloud Pak for Data job and job run
 */
interface CloudPakForDataJobAndJobRunProperties {
  cpdSpace: any;
  cpdProject: any;
  jobDefinitionName: string;
  jobDefinitionDescription: string;
  jobRunName: string;
  jobRunDescription: string;
  appBundleFilePath: string;
  jobConfigOverlay: string;
}

/**
 * Get the Cloud Pak for Data job type
 * @param space the Cloud Pak for Data space
 */
const getCpdJobType = (space: any): CloudPakForDataJobType =>
  space ? CloudPakForDataJobType.Space : CloudPakForDataJobType.Project;

/**
 * Refresh the Streams instance and Streams Explorer
 * @param connectionId the target Streams instance connection identifier
 */
const refreshStreamsInstance = async (connectionId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      await store.dispatch(refreshCloudPakForDataInfo(connectionId));
      getStreamsExplorer().refresh();
      resolve();
    }, 1000);
  });
};

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
 * Submit a Cloud Pak for Data Streams job
 * @param instance the target Streams instance
 * @param bundleFilePath the path to the application bundle file
 * @param messageHandlerId the message handler identifier
 */
const submitJob = async (
  instance: any,
  bundleFilePath?: string,
  messageHandlerId?: string
): Promise<any> => {
  const { connectionId } = instance;

  // Show webview panel to get properties from the user
  const properties: CloudPakForDataJobAndJobRunProperties = await new Promise(
    (resolve) => {
      commands.executeCommand(
        Commands.ENVIRONMENT.SHOW_CPD_JOB_PANEL,
        connectionId,
        JobAction.CreateAndConfigureRun,
        bundleFilePath ? { bundleFilePath } : null,
        resolve
      );
    }
  );
  if (properties) {
    const {
      cpdSpace,
      cpdProject,
      jobDefinitionName,
      jobDefinitionDescription,
      jobRunName,
      jobRunDescription,
      appBundleFilePath,
      jobConfigOverlay
    } = properties;
    const cpdSpaceId = cpdSpace?.metadata?.id;
    const cpdProjectId = cpdProject?.metadata?.guid;

    // Create the job
    const cpdJob = await store.dispatch(
      CpdJobCommon.createCloudPakForDataJob(
        connectionId,
        getCpdJobType(cpdSpace),
        cpdSpaceId || cpdProjectId,
        jobDefinitionName,
        jobDefinitionDescription,
        appBundleFilePath,
        jobConfigOverlay,
        messageHandlerId
      )
    );
    const cpdJobId = cpdJob.metadata.asset_id;
    const cpdJobName = cpdJob.metadata.name;

    refreshStreamsInstance(connectionId);

    // Start the job run
    await store.dispatch(
      CpdJobCommon.startCloudPakForDataJobRun(
        connectionId,
        getCpdJobType(cpdSpace),
        cpdSpaceId || cpdProjectId,
        cpdJobId,
        cpdJobName,
        jobRunName,
        jobRunDescription,
        null,
        null,
        messageHandlerId
      )
    );

    await refreshStreamsInstance(connectionId);
  }
};

/**
 * Edit a Cloud Pak for Data job
 * @param instance the target Streams instance
 * @param cpdSpace the Cloud Pak for Data space
 * @param cpdProject the Cloud Pak for Data project
 * @param cpdJob the Cloud Pak for Data job
 */
const editJob = async (
  instance: any,
  cpdSpace: any,
  cpdProject: any,
  cpdJob: any
): Promise<void> => {
  const { connectionId } = instance;
  const cpdSpaceId = cpdSpace?.metadata?.id;
  const cpdProjectId = cpdProject?.metadata?.guid;
  const cpdJobId = cpdJob.metadata.asset_id;
  const cpdJobName = cpdJob.metadata.name;

  // Show webview panel to get properties from the user
  const properties: CloudPakForDataJobEditProperties = await new Promise(
    (resolve) => {
      commands.executeCommand(
        Commands.ENVIRONMENT.SHOW_CPD_JOB_PANEL,
        connectionId,
        JobAction.Edit,
        { job: cpdJob, space: cpdSpace, project: cpdProject },
        resolve
      );
    }
  );
  if (properties) {
    const {
      jobDefinitionName,
      jobDefinitionDescription,
      appBundleFilePath,
      jobConfigOverlay
    } = properties;
    await store.dispatch(
      CpdJobCommon.updateCloudPakForDataJob(
        connectionId,
        getCpdJobType(cpdSpace),
        cpdSpaceId || cpdProjectId,
        cpdJobId,
        cpdJobName,
        jobDefinitionName,
        jobDefinitionDescription,
        appBundleFilePath,
        jobConfigOverlay
      )
    );

    await refreshJob(
      connectionId,
      getCpdJobType(cpdSpace),
      cpdSpaceId || cpdProjectId,
      cpdJobId
    );
  }
};

/**
 * Delete a Cloud Pak for Data job
 * @param instance the target Streams instance
 * @param cpdSpace the Cloud Pak for Data space
 * @param cpdProject the Cloud Pak for Data project
 * @param cpdJob the Cloud Pak for Data job
 */
const deleteJob = async (
  instance: any,
  cpdSpace: any,
  cpdProject: any,
  cpdJob: any
): Promise<void> => {
  const { connectionId } = instance;
  const cpdSpaceId = cpdSpace?.metadata?.id;
  const cpdProjectId = cpdProject?.metadata?.guid;
  const cpdJobId = cpdJob.metadata.asset_id;
  const cpdJobName = cpdJob.metadata.name;

  const instanceName = InstanceSelector.selectInstanceName(
    store.getState(),
    connectionId
  );
  const label = `Are you sure you want to delete the job definition ${cpdJobName} in the Streams instance ${instanceName}?`;
  const callbackFn = async (): Promise<void> => {
    await store.dispatch(
      CpdJobCommon.deleteCloudPakForDataJob(
        connectionId,
        getCpdJobType(cpdSpace),
        cpdSpaceId || cpdProjectId,
        cpdJobId,
        cpdJobName
      )
    );

    await refreshStreamsInstance(connectionId);
  };
  return VSCode.showConfirmationDialog(label, callbackFn);
};

/**
 * Get the URL for the Cloud Pak for Data job details page
 * @param connectionId the target Streams instance connection identifier
 * @param spaceId the Cloud Pak for Data space identifier
 * @param projectId the Cloud Pak for Data project identifier
 * @param jobId the Cloud Pak for Data job identifier
 */
const getCpdJobDetailsPageUrl = (
  connectionId: string,
  spaceId: string,
  projectId: string,
  jobId: string
): string => {
  const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
    store.getState(),
    connectionId
  );
  const spaceOrProjectId = spaceId
    ? `space_id=${spaceId}`
    : `project_id=${projectId}`;
  return `${cpdUrl}/jobs/${jobId}?${spaceOrProjectId}&context=icp4data`;
};

/**
 * Start a run for a Cloud Pak for Data job
 * @param instance the target Streams instance
 * @param cpdSpace the Cloud Pak for Data space
 * @param cpdProject the Cloud Pak for Data project
 * @param cpdJob the Cloud Pak for Data job
 */
const startJobRun = async (
  instance: any,
  cpdSpace: any,
  cpdProject: any,
  cpdJob: any
): Promise<void> => {
  const { connectionId } = instance;
  const cpdSpaceId = cpdSpace?.metadata?.id;
  const cpdProjectId = cpdProject?.metadata?.guid;
  const cpdJobId = cpdJob.metadata.asset_id;
  const cpdJobName = cpdJob.metadata.name;

  // Show webview panel to get properties from the user
  const jobRunProperties: CloudPakForDataJobRunProperties = await new Promise(
    (resolve) => {
      commands.executeCommand(
        Commands.ENVIRONMENT.SHOW_CPD_JOB_PANEL,
        connectionId,
        JobAction.ConfigureRun,
        { job: cpdJob, space: cpdSpace, project: cpdProject },
        resolve
      );
    }
  );
  if (jobRunProperties) {
    const {
      jobRunName,
      jobRunDescription,
      appBundleFilePath,
      jobConfigOverlay
    } = jobRunProperties;

    // Start the job run
    await store.dispatch(
      CpdJobCommon.startCloudPakForDataJobRun(
        connectionId,
        getCpdJobType(cpdSpace),
        cpdSpaceId || cpdProjectId,
        cpdJobId,
        cpdJobName,
        jobRunName,
        jobRunDescription,
        appBundleFilePath,
        jobConfigOverlay,
        null
      )
    );

    await refreshJob(
      connectionId,
      getCpdJobType(cpdSpace),
      cpdSpaceId || cpdProjectId,
      cpdJobId
    );
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
 * Helper methods for Cloud Pak for Data jobs
 */
const CpdJob = {
  submitJob,
  editJob,
  deleteJob,
  getCpdJobDetailsPageUrl,
  startJobRun,
  handleError
};

export default CpdJob;
