import * as path from 'path';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { TreeItemType } from '.';

/**
 * Tree item that represents information
 */
export default class InfoTreeItem extends TreeItem {
  public type = TreeItemType.Info;
  public children = null;

  constructor(
    private _extensionPath: string,
    public label: string,
    private _commandName?: string,
    private _commandArg?: any,
    public instance?: any
  ) {
    super(label, TreeItemCollapsibleState.None);

    // Set command
    this.command = this._commandName
      ? {
          title: '',
          command: this._commandName,
          arguments: this._commandArg ? [this._commandArg] : null
        }
      : null;

    // Set context value
    this.contextValue = `${this.type}TreeItem`;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'information.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };
  }
}
