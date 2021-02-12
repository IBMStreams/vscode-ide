import { InstanceSelector, Registry, store } from '@ibmstreams/common';
import * as path from 'path';
import _isEqual from 'lodash/isEqual';
import { CpdJobRun } from '../../../streams';
import { env, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { BuiltInCommands, Views } from '../../../utils';

export default class JobsTreeItem extends TreeItem {
  public type = 'streamsJobs';
  private _defaultTreeData = {
    label:
      'Select an item containing active runs in the Instances view to display them.'
  };

  constructor(
    private _extensionPath: string,
    public jobRunName: string,
    public jobRun: any,
    public job: any,
    public space: any,
    public project: any,
    public instance: any,
    public readonly label?: string,
    public readonly value?: string,
    public readonly isUrl?: boolean,
    public readonly children?: JobsTreeItem[] | null
  ) {
    super(jobRunName, TreeItemCollapsibleState.None);

    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];

    // Set icon path
    this.label = jobRunName;
    const iconFileName = 'event-schedule.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    const jobRunState = jobRun.entity.job_run.state;
    const description = jobRun.metadata.description;
    const createdAt = new Date(jobRun.metadata.created_at).toLocaleString();

    //set tooltip
    this.tooltip = `Cloud Pak for Data job run${
      jobRunName ? `\n\n\u2022 Name: ${jobRunName}` : ''
    }${
      description ? `\n\u2022 Description: ${description}` : ''
    }\n\u2022 Created at: ${createdAt}\n\u2022 State: ${jobRunState}`;

    // Set description
    this.description = jobRunState;

    // Set context value
    this.contextValue = `${this.type}TreeItem`;
  }

  /**
   * Cloud Pak for Data project identifier
   */
  public get projectId(): string {
    return this?.project?.metadata?.guid;
  }

  /**
   * Cloud Pak for Data space identifier
   */
  public get spaceId(): string {
    return this?.space?.metadata?.id;
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
}
