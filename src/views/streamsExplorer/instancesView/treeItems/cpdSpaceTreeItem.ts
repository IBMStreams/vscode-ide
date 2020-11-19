import { Registry } from '@ibmstreams/common';
import * as path from 'path';
import { env, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { CpdJobTreeItem, InfoTreeItem, TreeItemType } from '.';
import { CpdSpace } from '../../../../streams';

/**
 * Tree item that represents a Cloud Pak for Data space
 */
export default class CpdSpaceTreeItem extends TreeItem {
  public type = TreeItemType.CpdSpace;

  constructor(
    private _extensionPath: string,
    spaceName: string,
    public space: any,
    public instance: any,
    public children: (InfoTreeItem | CpdJobTreeItem)[]
  ) {
    super(
      spaceName,
      children
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None
    );

    // Set context value
    this.contextValue = `${this.type}TreeItem`;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'workspace.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set tooltip
    const { description } = space.entity;
    const createdAt = new Date(space.metadata.created_at).toLocaleString();
    const updatedAt = new Date(space.metadata.updated_at).toLocaleString();
    this.tooltip = `Cloud Pak for Data deployment space\n\n\u2022 Name: ${spaceName}${
      description && description.trim() !== ''
        ? `\n\u2022 Description: ${description}`
        : ''
    }\n\u2022 Created at: ${createdAt}\n\u2022 Updated at: ${updatedAt}`;
  }

  /**
   * Cloud Pak for Data space identifier
   */
  public get spaceId(): string {
    return this.space.metadata.id;
  }

  /**
   * Open IBM Cloud Pak for Data space details page
   */
  public async openCpdDetails(): Promise<boolean> {
    try {
      if (this.spaceId) {
        const url = CpdSpace.getCpdSpaceDetailsPageUrl(
          this.instance.connectionId,
          this.spaceId
        );
        return env.openExternal(Uri.parse(url));
      }
      throw new Error();
    } catch (err) {
      const errorMsg =
        'Error opening the IBM Cloud Pak for Data space details page.';
      Registry.getDefaultMessageHandler().handleError(errorMsg, {
        detail: err.response || err.message || err,
        stack: err.response || err.stack,
        showNotification: false
      });
    }
  }
}
