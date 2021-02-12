import {
  InstanceSelector,
  Job,
  Registry,
  store,
  StreamsInstanceType
} from '@ibmstreams/common';
import * as fs from 'fs';
import _startCase from 'lodash/startCase';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import { env, TreeItem, TreeItemCollapsibleState, Uri, window } from 'vscode';
import { TreeItemType } from '.';
import { StreamsInstance } from '../../../../streams';
import { Logger, VSCode } from '../../../../utils';

/**
 * Tree item that represents a Streams job
 */
export default class JobTreeItem extends TreeItem {
  public type = TreeItemType.Job;
  public children = null;
  public jobId: string;
  public jobName: string;

  constructor(
    private _extensionPath: string,
    public job: any,
    public instance: any
  ) {
    super(`${job.id}: ${job.name}`, TreeItemCollapsibleState.None);
    this.jobId = job.id;
    this.jobName = job.name;

    // Set context value
    this.contextValue = this.getContextValue();

    // Set description
    this.description = job ? _startCase(job.health) : null;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'flow--stream.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set tooltip
    this.tooltip = job
      ? `Submitted by ${job.startedBy} on ${new Date(
          job.submitTime
        ).toLocaleString()}`
      : undefined;
  }

  /**
   * Open IBM Cloud Pak for Data Job Details page
   */
  public async openCpdJobDetails(): Promise<boolean> {
    try {
      if (this.jobId) {
        const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
          store.getState(),
          this.instance.connectionId
        );
        const serviceInstanceId = InstanceSelector.selectCloudPakForDataServiceInstanceId(
          store.getState(),
          this.instance.connectionId
        );
        const jobDetailsUrl = `${cpdUrl}/streams/webpage/#/streamsJobDetails/streams-${serviceInstanceId}-${this.jobId}`;
        return env.openExternal(Uri.parse(jobDetailsUrl));
      }
      throw new Error();
    } catch (error) {
      Registry.getDefaultMessageHandler().logError(
        'Error opening IBM Cloud Pak for Data job details page.',
        { showNotification: true }
      );
      if (error.stack) {
        Registry.getDefaultMessageHandler().logError(error.stack);
      }
    }
  }

  /**
   * Open IBM Cloud Pak for Data Project
   * @param defaultInstance the default instance
   */
  public async openCpdProject(): Promise<boolean> {
    if (this.jobId) {
      try {
        const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
          store.getState(),
          this.instance.connectionId
        );
        const cpdZenJobs = InstanceSelector.selectCloudPakForDataZenJobs(
          store.getState(),
          this.instance.connectionId
        );
        const cpdZenJob = cpdZenJobs.find(
          (zenJob: any) => zenJob.job_id === this.jobId
        );
        if (cpdZenJob && cpdZenJob.project_id && cpdZenJob.project_name) {
          const cpdVersion = InstanceSelector.selectCloudPakForDataVersion(
            store.getState(),
            this.instance.connectionId,
            true
          );
          const cpdProjectUrl = semver.lt(cpdVersion, '2.5.0')
            ? `${cpdUrl}/#/projects/${cpdZenJob.project_name}`
            : `${cpdUrl}/projects/${cpdZenJob.project_id}`;
          return env.openExternal(Uri.parse(cpdProjectUrl));
        }
      } catch (error) {
        Registry.getDefaultMessageHandler().logError(
          'Error opening IBM Cloud Pak for Data project.',
          { showNotification: true }
        );
        if (error.stack) {
          Registry.getDefaultMessageHandler().logError(error.stack);
        }
      }
    }
  }

  /**
   * Download Streams job logs
   */
  public async downloadLogs(): Promise<void> {
    if (this.jobId && this.jobName) {
      const instanceName = InstanceSelector.selectInstanceName(
        store.getState(),
        this.instance.connectionId
      );
      try {
        Registry.getDefaultMessageHandler().logInfo(
          `Downloading logs for the job ${this.jobName} in the Streams instance ${instanceName}...`
        );
        const { data } = await store.dispatch(
          Job.downloadStreamsJobLogs(this.instance.connectionId, this.jobId)
        );
        if (!data) {
          throw new Error('No log data was received.');
        }

        const options = {
          defaultUri: Uri.file(
            path.join(
              os.homedir(),
              `StreamsJobLogs-${instanceName}-job${
                this.jobId
              }-${new Date().getTime()}.tar.gz`
            )
          ),
          saveLabel: 'Save'
        };
        window.showSaveDialog(options).then((uri: Uri) => {
          if (uri) {
            if (fs.existsSync(uri.fsPath)) {
              fs.unlinkSync(uri.fsPath);
            }
            fs.writeFileSync(uri.fsPath, data);
            Registry.getDefaultMessageHandler().logInfo(
              `Downloaded logs for the job ${this.jobName} in the Streams instance ${instanceName} to: ${uri.fsPath}.`
            );
          }
        });
      } catch (error) {
        Registry.getDefaultMessageHandler().logError(
          `An error occurred while downloading logs for the job ${this.jobName} in the Streams instance ${instanceName}.`,
          {
            detail: error.response || error.message || error,
            stack: error.response || error.stack,
            showNotification: true
          }
        );
      }
    }
  }

  /**
   * Cancel a Streams job
   */
  public async cancel(): Promise<void> {
    if (this.jobId && this.jobName) {
      const instanceName = InstanceSelector.selectInstanceName(
        store.getState(),
        this.instance.connectionId
      );
      const label = `Are you sure you want to cancel the job ${this.jobName} in the Streams instance ${instanceName}?`;
      const callbackFn = async (): Promise<void> => {
        try {
          Registry.getDefaultMessageHandler().logInfo(
            `Canceling the job ${this.jobName} in the Streams instance ${instanceName}...`
          );
          await store.dispatch(
            Job.cancelStreamsJob(this.instance.connectionId, this.jobId)
          );
          setTimeout(() => {
            StreamsInstance.refreshInstances();
            Registry.getDefaultMessageHandler().logInfo(
              `The job ${this.jobName} in the Streams instance ${instanceName} was successfully canceled.`
            );
          }, 3000);
        } catch (error) {
          Registry.getDefaultMessageHandler().logError(
            `An error occurred while canceling the job ${this.jobName} in the Streams instance ${instanceName}.`,
            {
              detail: error.response || error.message || error,
              stack: error.response || error.stack,
              showNotification: true
            }
          );
        }
      };
      return VSCode.showConfirmationDialog(label, callbackFn);
    }
    return null;
  }

  /**
   * Get the context value
   */
  private getContextValue(): string {
    const instanceType = InstanceSelector.selectInstanceType(
      store.getState(),
      this.instance.connectionId
    );
    const cpdProjectValue = this.hasCpdProject(instanceType)
      ? 'cpdProject'
      : null;
    const treeItemType = 'jobTreeItem';
    // Possible context values:
    // v5_cpd_(cpdProject_?)jobTreeItem
    // v5_standalone_jobTreeItem
    // v4_streamingAnalytics_jobTreeItem
    return `${instanceType}_${
      cpdProjectValue ? `${cpdProjectValue}_` : ''
    }${treeItemType}`;
  }

  /**
   * Check whether this job is associated with a Cloud Pak for Data project
   * @param instanceType the Streams instance type
   */
  private hasCpdProject(instanceType: StreamsInstanceType): boolean {
    if (instanceType === StreamsInstanceType.V5_CPD) {
      const cpdZenJobs = InstanceSelector.selectCloudPakForDataZenJobs(
        store.getState(),
        this.instance.connectionId
      );
      const cpdZenJob = cpdZenJobs.find(
        (zenJob: any) => zenJob.job_id === this.jobId
      );
      return cpdZenJob && cpdZenJob.project_id && cpdZenJob.project_name;
    }
    return false;
  }
}
