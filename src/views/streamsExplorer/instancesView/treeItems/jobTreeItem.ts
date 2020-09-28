import {
    InstanceSelector, Job, Registry, store, StreamsInstanceType, CloudPakForDataVersion
} from '@ibmstreams/common';
import * as fs from 'fs';
import _startCase from 'lodash/startCase';
import * as os from 'os';
import * as path from 'path';
import {
    commands, TreeItem, TreeItemCollapsibleState, Uri, window
} from 'vscode';
import { TreeItemType } from '.';
import { StreamsInstance } from '../../../../streams';
import { BuiltInCommands, Logger, VSCode } from '../../../../utils';

/**
 * Tree item that represents a Streams job
 */
export default class JobTreeItem extends TreeItem {
    public type = TreeItemType.Job;
    public children = null;
    public jobId: string;
    public jobName: string;

    constructor(private _extensionPath: string, public job: any, private instance: any) {
        super(`${job.id}: ${job.name}`, TreeItemCollapsibleState.None);
        this.jobId = job.id;
        this.jobName = job.name;
    }

    public get contextValue(): string {
        const instanceType = InstanceSelector.selectInstanceType(store.getState(), this.instance.connectionId);
        const cpdProjectValue = this._hasCpdProject(instanceType) ? 'cpdProject' : null;
        const treeItemType = 'jobTreeItem';
        // Possible context values:
        // v5_cpd_(cpdProject_?)jobTreeItem
        // v5_standalone_jobTreeItem
        // v4_streamingAnalytics_jobTreeItem
        return `${instanceType}_${cpdProjectValue ? `${cpdProjectValue}_` : ''}${treeItemType}`;
    }

    public description = this.job ? _startCase(this.job.health) : null;

    public iconPath = {
        light: path.join(this._extensionPath, 'images', 'icons', 'light', 'flow--stream.svg'),
        dark: path.join(this._extensionPath, 'images', 'icons', 'dark', 'flow--stream.svg')
    };

    public tooltip = this.job
        ? `Submitted by ${this.job.startedBy} on ${(new Date(this.job.submitTime)).toLocaleString()}`
        : undefined;

    /**
     * Open IBM Cloud Pak for Data Job Details page
     */
    public openCpdJobDetails(): void {
        try {
            if (this.jobId) {
                const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(store.getState(), this.instance.connectionId);
                const serviceInstanceId = InstanceSelector.selectCloudPakForDataServiceInstanceId(store.getState(), this.instance.connectionId);
                const jobDetailsUrl = `${cpdUrl}/streams/webpage/#/streamsJobDetails/streams-${serviceInstanceId}-${this.jobId}`;
                commands.executeCommand(BuiltInCommands.Open, Uri.parse(jobDetailsUrl));
                return;
            }
            throw new Error();
        } catch (error) {
            Logger.error(null, 'Error opening IBM Cloud Pak for Data job details page.', true);
            if (error.stack) {
                Logger.error(null, error.stack);
            }
        }
    }

    /**
     * Open IBM Cloud Pak for Data Project
     * @param defaultInstance    The default instance
     */
    public openCpdProject(): void {
        if (this.jobId) {
            try {
                const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(store.getState(), this.instance.connectionId);
                const cpdZenJobs = InstanceSelector.selectCloudPakForDataZenJobs(store.getState(), this.instance.connectionId);
                const cpdZenJob = cpdZenJobs.find((zenJob: any) => zenJob.job_id === this.jobId);
                if (cpdZenJob && cpdZenJob.project_id && cpdZenJob.project_name) {
                    const cpdVersion = InstanceSelector.selectCloudPakForDataVersion(store.getState(), this.instance.connectionId);
                    const cpdProjectUrl = cpdVersion === CloudPakForDataVersion.V2_1
                        ? `${cpdUrl}/#/projects/${cpdZenJob.project_name}`
                        : `${cpdUrl}/projects/${cpdZenJob.project_id}`;
                    commands.executeCommand(BuiltInCommands.Open, Uri.parse(cpdProjectUrl));
                }
            } catch (error) {
                Logger.error(null, 'Error opening IBM Cloud Pak for Data project.', true);
                if (error.stack) {
                    Logger.error(null, error.stack);
                }
            }
        }
    }

    /**
     * Download Streams job logs
     */
    public async downloadLogs(): Promise<void> {
        if (this.jobId && this.jobName) {
            const instanceName = InstanceSelector.selectInstanceName(store.getState(), this.instance.connectionId);
            try {
                Registry.getDefaultMessageHandler().handleInfo(`Downloading logs for the job ${this.jobName} in the Streams instance ${instanceName}...`);
                const { data } = await store.dispatch(Job.downloadStreamsJobLogs(this.instance.connectionId, this.jobId));
                if (!data) {
                    throw new Error('No log data was received.');
                }

                const options = {
                    defaultUri: Uri.file(path.join(os.homedir(), `StreamsJobLogs-${instanceName}-job${this.jobId}-${new Date().getTime()}.tar.gz`)),
                    saveLabel: 'Save'
                };
                window.showSaveDialog(options).then((uri: Uri) => {
                    if (uri) {
                        if (fs.existsSync(uri.fsPath)) {
                            fs.unlinkSync(uri.fsPath);
                        }
                        fs.writeFileSync(uri.fsPath, data);
                        Registry.getDefaultMessageHandler().handleInfo(`Downloaded logs for the job ${this.jobName} in the Streams instance ${instanceName} to: ${uri.fsPath}.`);
                    }
                });
            } catch (error) {
                Registry.getDefaultMessageHandler().handleError(
                    `An error occurred while downloading logs for the job ${this.jobName} in the Streams instance ${instanceName}.`,
                    {
                        detail: error.response || error.message || error,
                        stack: error.response || error.stack
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
            const instanceName = InstanceSelector.selectInstanceName(store.getState(), this.instance.connectionId);
            const label = `Are you sure you want to cancel the job ${this.jobName} in the Streams instance ${instanceName}?`;
            const callbackFn = async (): Promise<void> => {
                try {
                    Registry.getDefaultMessageHandler().handleInfo(`Canceling the job ${this.jobName} in the Streams instance ${instanceName}...`);
                    await store.dispatch(Job.cancelStreamsJob(this.instance.connectionId, this.jobId));
                    setTimeout(() => {
                        StreamsInstance.refreshInstances();
                        Registry.getDefaultMessageHandler().handleSuccess(`The job ${this.jobName} in the Streams instance ${instanceName} was successfully canceled.`);
                    }, 3000);
                } catch (error) {
                    Registry.getDefaultMessageHandler().handleError(
                        `An error occurred while canceling the job ${this.jobName} in the Streams instance ${instanceName}.`,
                        {
                            detail: error.response || error.message || error,
                            stack: error.response || error.stack
                        }
                    );
                }
            };
            return VSCode.showConfirmationDialog(label, callbackFn);
        }
        return null;
    }

    /**
     * Check whether this job is associated with a Cloud Pak for Data project
     * @param instanceType    The Streams instance type
     */
    private _hasCpdProject(instanceType: StreamsInstanceType): boolean {
        if (instanceType === StreamsInstanceType.V5_CPD) {
            const cpdZenJobs = InstanceSelector.selectCloudPakForDataZenJobs(store.getState(), this.instance.connectionId);
            const cpdZenJob = cpdZenJobs.find((zenJob: any) => zenJob.job_id === this.jobId);
            return cpdZenJob && cpdZenJob.project_id && cpdZenJob.project_name;
        }
        return false;
    }
}
