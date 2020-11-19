import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { StreamsTreeItem, TreeItemType } from '.';

/**
 * Tree item that represents a label
 */
export default class LabelTreeItem extends TreeItem {
  public type: string;

  constructor(
    label: string,
    public data: any,
    type: string,
    public children: StreamsTreeItem[]
  ) {
    super(
      label,
      children
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None
    );

    this.contextValue = `${type}TreeItem`;
    this.type = type || TreeItemType.Label;
  }
}
