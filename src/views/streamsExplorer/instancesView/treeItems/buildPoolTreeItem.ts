import * as path from 'path';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { LabelTreeItem, TreeItemType } from '.';

/**
 * Tree item that represents a build pool
 */
export default class BuildPoolTreeItem extends TreeItem {
  public type = TreeItemType.BuildPool;

  constructor(
    private _extensionPath: string,
    public buildPool: any,
    public children: LabelTreeItem[]
  ) {
    super(
      buildPool.name,
      children
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );

    // Set context value
    this.contextValue = `${this.type}TreeItem`;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'network--1.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };
  }
}
