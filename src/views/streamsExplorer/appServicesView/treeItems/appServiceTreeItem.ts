import { Registry } from '@ibmstreams/common';
import * as path from 'path';
import { env, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { AppServiceEndpointTagTreeItem, TreeItemType } from '.';

export default class AppServiceTreeItem extends TreeItem {
  public type = TreeItemType.AppService;

  constructor(
    public readonly extensionPath: string,
    public readonly instance: any,
    public readonly service,
    public children: AppServiceEndpointTagTreeItem[]
  ) {
    super(
      service.display_name,
      children
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );

    // Set context value
    this.contextValue = `${this.type}TreeItem`;

    // Set description
    this.description = this.jobName;

    // Set icon path
    const iconsFolderPath = [this.extensionPath, 'images', 'icons'];
    const iconFileName = 'application.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set tooltip
    this.tooltip = `Streams application service\n\nName: ${this.name}\nJob ID: ${this.jobId}\nJob name: ${this.jobName}`;
  }

  /**
   * Name
   */
  public get name(): string {
    return this.service.display_name;
  }

  /**
   * Job ID
   */
  public get jobId(): string {
    return this.service.parameters.jobId;
  }

  /**
   * Job name
   */
  public get jobName(): string {
    return this.service.parameters.jobName;
  }

  /**
   * Open REST API documentation in a browser
   */
  public async openRestApiDoc(): Promise<boolean> {
    try {
      if (this.service) {
        return env.openExternal(Uri.parse(this.service.apiViewer));
      }
      throw new Error();
    } catch (err) {
      const errorMsg =
        'Error opening the REST API documentation for the Streams application service.';
      Registry.getDefaultMessageHandler().logError(errorMsg, {
        detail: err.response || err.message || err,
        stack: err.response || err.stack
      });
    }
  }
}
