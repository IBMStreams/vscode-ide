import * as path from 'path';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { InfoTreeItem, JobTreeItem, TreeItemType } from '.';

/**
 * Tree item that represents a Streams job group
 */
export default class JobGroupTreeItem extends TreeItem {
  public type = TreeItemType.JobGroup;

  constructor(
    private _extensionPath: string,
    name: string,
    public children: (InfoTreeItem | JobTreeItem)[]
  ) {
    super(
      name,
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
    this.tooltip = 'Job group';
  }
}
