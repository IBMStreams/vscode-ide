import { Registry } from '@ibmstreams/common';
import * as path from 'path';
import { env, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { LabelTreeItem, TreeItemType } from '.';
import { CpdJobRun } from '../../../../streams';
import {
  CpdJobRunFinishedStates,
  CpdJobRunRunningStates
} from '../../../../utils';

/**
 * Tree item that represents a Cloud Pak for Data job run
 */
export default class CpdJobRunTreeItem extends TreeItem {
  public type = TreeItemType.CpdJobRun;

  constructor(
    private _extensionPath: string,
    public jobRunName: string,
    public jobRun: any,
    public job: any,
    public space: any,
    public project: any,
    public instance: any,
    public children: LabelTreeItem[]
  ) {
    super(
      jobRunName,
      children
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );

    // Set context value
    let contextValue: string;
    const treeItemType = `${this.type}TreeItem`;
    const jobRunState = jobRun.entity.job_run.state;
    if (CpdJobRunRunningStates.includes(jobRunState)) {
      // Job runs in running state can be canceled
      contextValue = `running_${treeItemType}`;
    } else if (CpdJobRunFinishedStates.includes(jobRunState)) {
      // Job runs in finsished state can be deleted
      contextValue = `finished_${treeItemType}`;
    } else {
      contextValue = treeItemType;
    }
    this.contextValue = contextValue;

    // Set description
    this.description = jobRunState;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'event-schedule.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set label
    this.label = jobRunName;

    // Set tooltip
    const description = jobRun.metadata.description;
    const createdAt = new Date(jobRun.metadata.created_at).toLocaleString();
    this.tooltip = `Cloud Pak for Data job run${
      jobRunName ? `\n\n\u2022 Name: ${jobRunName}` : ''
    }${
      description ? `\n\u2022 Description: ${description}` : ''
    }\n\u2022 Created at: ${createdAt}\n\u2022 State: ${jobRunState}`;
  }

  /**
   * Cloud Pak for Data space identifier
   */
  public get spaceId(): string {
    return this?.space?.metadata?.id;
  }

  /**
   * Cloud Pak for Data project identifier
   */
  public get projectId(): string {
    return this?.project?.metadata?.guid;
  }

  /**
   * Cloud Pak for Data job definition identifier
   */
  public get jobId(): string {
    return this.job.metadata.asset_id;
  }

  /**
   * Cloud Pak for Data job definition name
   */
  public get jobName(): string {
    return this.job.metadata.name;
  }

  /**
   * Cloud Pak for Data job run identifier
   */
  public get jobRunId(): string {
    return this.jobRun.metadata.asset_id;
  }

  /**
   * Streams job identifier
   */
  public get streamsJobId(): string {
    return this.jobRun.entity.job_run.configuration.jobId;
  }

  /**
   * Open IBM Cloud Pak for Data job run details page
   */
  public async openCpdDetails(): Promise<boolean> {
    try {
      if (
        this.instance &&
        (this.spaceId || this.projectId) &&
        this.jobId &&
        this.jobRunId
      ) {
        const url = CpdJobRun.getCpdJobRunDetailsPageUrl(
          this.instance.connectionId,
          this.spaceId,
          this.projectId,
          this.jobId,
          this.jobRunId
        );
        return env.openExternal(Uri.parse(url));
      }
      throw new Error();
    } catch (err) {
      const errorMsg =
        'Error opening the IBM Cloud Pak for Data job run details page.';
      Registry.getDefaultMessageHandler().logError(errorMsg, {
        detail: err.response || err.message || err,
        stack: err.response || err.stack
      });
    }
  }

  /**
   * Create job run log snapshot
   */
  public async createJobRunLogSnapshot(): Promise<void> {
    try {
      if (
        this.instance &&
        (this.spaceId || this.projectId) &&
        this.jobId &&
        this.jobRunId
      ) {
        await CpdJobRun.createJobRunLogSnapshot(
          this.instance.connectionId,
          this.spaceId,
          this.projectId,
          this.jobId,
          this.jobName,
          this.jobRunId,
          this.jobRunName
        );
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJobRun.handleError(err);
    }
  }

  /**
   * Cancel job run
   */
  public async cancelJobRun(): Promise<void> {
    try {
      if (
        this.instance &&
        (this.spaceId || this.projectId) &&
        this.jobId &&
        this.jobRunId
      ) {
        await CpdJobRun.cancelJobRun(
          this.instance,
          this.spaceId,
          this.projectId,
          this.jobId,
          this.jobName,
          this.jobRunId,
          this.jobRunName
        );
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJobRun.handleError(err);
    }
  }

  /**
   * Delete job run
   */
  public async deleteJobRun(): Promise<void> {
    try {
      if (
        this.instance &&
        (this.spaceId || this.projectId) &&
        this.jobId &&
        this.jobRunId
      ) {
        await CpdJobRun.deleteJobRun(
          this.instance,
          this.spaceId,
          this.projectId,
          this.jobId,
          this.jobName,
          this.jobRunId,
          this.jobRunName
        );
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJobRun.handleError(err);
    }
  }
}
