import * as path from 'path';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { AppServiceEndpointPathTreeItem, TreeItemType } from '.';

export default class AppServiceEndpointTagTreeItem extends TreeItem {
  public type = TreeItemType.AppServiceEndpointTag;

  constructor(
    public readonly extensionPath: string,
    public readonly instance: any,
    public readonly tag: string,
    public readonly service,
    public children: AppServiceEndpointPathTreeItem[]
  ) {
    super(
      tag,
      children
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None
    );

    // Set context value
    this.contextValue = `${this.type}TreeItem`;

    // Set icon path
    const iconsFolderPath = [this.extensionPath, 'images', 'icons'];
    const iconFileName = 'tag.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set tooltip
    this.tooltip = `Streams application service endpoint tag\n\nName: ${tag}`;
  }
}
