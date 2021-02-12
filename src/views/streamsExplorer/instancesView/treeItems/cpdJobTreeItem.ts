import { Registry } from '@ibmstreams/common';
import * as path from 'path';
import { env, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { CpdJobRunTreeItem, TreeItemType } from '.';
import { CpdJob } from '../../../../streams';
import { CpdJobRunFinishedStates } from '../../../../utils';

/**
 * Tree item that represents a Cloud Pak for Data job definition
 */
export default class CpdJobTreeItem extends TreeItem {
  public type = TreeItemType.CpdJob;

  constructor(
    private _extensionPath: string,
    public jobName: string,
    public job: any,
    public space: any,
    public project: any,
    public instance: any,
    public children: CpdJobRunTreeItem[]
  ) {
    super(
      jobName,
      children
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );

    // Set context value
    let contextValue: string;
    const treeItemType = `${this.type}TreeItem`;
    if (job?.entity?.job?.asset_ref_type === 'streams_legacy') {
      // The default job cannot be edited or deleted, and a job run cannot be started from VS Code
      contextValue = `default_${treeItemType}`;
    } else if (children && children.length) {
      // Jobs with job runs in finished state can be deleted
      const jobRunsInFinishedState = children.every((child) =>
        CpdJobRunFinishedStates.includes(child.jobRun.entity.job_run.state)
      );
      contextValue = jobRunsInFinishedState
        ? `finished_${treeItemType}`
        : treeItemType;
    } else {
      contextValue = `finished_${treeItemType}`;
    }
    this.contextValue = contextValue;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'timer.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set tooltip
    const description = job.metadata.description;
    const hasDescription = description && description.trim() !== '';
    this.tooltip = `Cloud Pak for Data job definition\n\n${
      hasDescription ? '\u2022 ' : ''
    }Name: ${jobName}${
      hasDescription ? `\n\u2022 Description: ${description}` : ''
    }`;
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
   * Open IBM Cloud Pak for Data job definition details page
   */
  public async openCpdDetails(): Promise<boolean> {
    try {
      if ((this.spaceId || this.projectId) && this.jobId) {
        const url = CpdJob.getCpdJobDetailsPageUrl(
          this.instance.connectionId,
          this.spaceId,
          this.projectId,
          this.jobId
        );
        return env.openExternal(Uri.parse(url));
      }
      throw new Error();
    } catch (err) {
      const errorMsg =
        'Error opening the IBM Cloud Pak for Data job definition details page.';
      Registry.getDefaultMessageHandler().logError(errorMsg, {
        detail: err.response || err.message || err,
        stack: err.response || err.stack
      });
    }
  }

  /**
   * Edit job
   */
  public async editJob(): Promise<void> {
    try {
      if (this.instance && (this.space || this.project) && this.job) {
        await CpdJob.editJob(this.instance, this.space, this.project, this.job);
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJob.handleError(err);
    }
  }

  /**
   * Delete job
   */
  public async deleteJob(): Promise<void> {
    try {
      if (this.instance && (this.space || this.project) && this.job) {
        await CpdJob.deleteJob(
          this.instance,
          this.space,
          this.project,
          this.job
        );
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJob.handleError(err);
    }
  }

  /**
   * Start job run
   */
  public async startJobRun(): Promise<void> {
    try {
      if (this.instance && (this.space || this.project) && this.job) {
        await CpdJob.startJobRun(
          this.instance,
          this.space,
          this.project,
          this.job
        );
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJob.handleError(err);
    }
  }
}
