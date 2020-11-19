import * as path from 'path';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { TreeItemType } from '.';
import { CpdJobRun } from '../../../../streams';

const APPLICATION_TRACE_LABEL = 'Application trace';
const PRODUCT_LOG = 'Product log';

/**
 * Tree item that represents a Cloud Pak for Data job run log
 */
export default class CpdJobRunLogTreeItem extends TreeItem {
  public type = TreeItemType.CpdJobRunLog;
  public children = null;
  public jobRunLogType: string;

  constructor(
    private _extensionPath: string,
    logFilePath: string,
    public jobRunLog: any,
    public jobRun: any,
    public job: any,
    public space: any,
    public project: any,
    public instance: any
  ) {
    super(logFilePath, TreeItemCollapsibleState.None);

    this.jobRunLogType = logFilePath.endsWith('.tgz')
      ? APPLICATION_TRACE_LABEL
      : PRODUCT_LOG;

    // Set context value
    this.contextValue = `${this.type}TreeItem`;

    // Set description
    const { last_modified } = jobRunLog;
    const lastModifiedDate = new Date(last_modified).toLocaleString();
    this.description = lastModifiedDate;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'document.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set label
    this.label = this.jobRunLogType;

    // Set tooltip
    this.tooltip = `Cloud Pak for Data Job run log\n\nName: ${this.jobRunLogName}`;
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
   * Cloud Pak for Data job run name
   */
  public get jobRunName(): string {
    return this.jobRun.metadata.name;
  }

  /**
   * Cloud Pak for Data job run log path
   */
  public get jobRunLogPath(): string {
    return this.jobRunLog.path;
  }

  /**
   * Cloud Pak for Data job run log name
   */
  public get jobRunLogName(): string {
    return this.jobRunLog.path.split('/').pop();
  }

  /**
   * Delete job run log
   */
  public async deleteLog(): Promise<void> {
    try {
      if (
        this.instance &&
        (this.spaceId || this.projectId) &&
        this.jobId &&
        this.jobRunId
      ) {
        await CpdJobRun.deleteJobRunLog(
          this.instance.connectionId,
          this.spaceId,
          this.projectId,
          this.jobId,
          this.jobName,
          this.jobRunId,
          this.jobRunName,
          this.jobRunLogPath,
          this.jobRunLogName,
          this.jobRunLogType
        );
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJobRun.handleError(err);
    }
  }

  /**
   * Download job run log
   */
  public async downloadLog(): Promise<void> {
    try {
      if (
        this.instance &&
        (this.spaceId || this.projectId) &&
        this.jobId &&
        this.jobRunId
      ) {
        await CpdJobRun.downloadJobRunLog(
          this.instance.connectionId,
          this.spaceId,
          this.projectId,
          this.jobId,
          this.jobName,
          this.jobRunId,
          this.jobRunName,
          this.jobRunLogPath,
          this.jobRunLogName,
          this.jobRunLogType
        );
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJobRun.handleError(err);
    }
  }
}
