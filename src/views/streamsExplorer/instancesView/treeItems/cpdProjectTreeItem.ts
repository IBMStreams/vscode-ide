import { Registry } from '@ibmstreams/common';
import * as path from 'path';
import { env, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { CpdJobTreeItem, InfoTreeItem, TreeItemType } from '.';
import { CpdProject } from '../../../../streams';

/**
 * Tree item that represents a Cloud Pak for Data project
 */
export default class CpdProjectTreeItem extends TreeItem {
  public type = TreeItemType.CpdProject;

  constructor(
    private _extensionPath: string,
    projectName: string,
    public project: any,
    public instance: any,
    public children: (InfoTreeItem | CpdJobTreeItem)[]
  ) {
    super(
      projectName,
      children
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None
    );

    // Set context value
    this.contextValue = `${this.type}TreeItem`;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'folder.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set tooltip
    const { description } = project.entity;
    const createdAt = new Date(project.metadata.created_at).toLocaleString();
    const updatedAt = new Date(project.metadata.updated_at).toLocaleString();
    this.tooltip = `Cloud Pak for Data project\n\n\u2022 Name: ${projectName}${
      description && description.trim() !== ''
        ? `\n\u2022 Description: ${description}`
        : ''
    }\n\u2022 Created at: ${createdAt}\n\u2022 Updated at: ${updatedAt}`;
  }

  /**
   * Cloud Pak for Data project identifier
   */
  public get projectId(): string {
    return this.project.metadata.guid;
  }

  /**
   * Open IBM Cloud Pak for Data project details page
   */
  public async openCpdDetails(): Promise<boolean> {
    try {
      if (this.projectId) {
        const url = CpdProject.getCpdProjectDetailsPageUrl(
          this.instance.connectionId,
          this.projectId
        );
        return env.openExternal(Uri.parse(url));
      }
      throw new Error();
    } catch (err) {
      const errorMsg =
        'Error opening the IBM Cloud Pak for Data project details page.';
      Registry.getDefaultMessageHandler().handleError(errorMsg, {
        detail: err.response || err.message || err,
        stack: err.response || err.stack,
        showNotification: false
      });
    }
  }
}
