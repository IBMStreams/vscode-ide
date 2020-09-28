import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { BuildPoolTreeItem, InfoTreeItem, JobGroupTreeItem, TreeItemType } from '.';

/**
 * Tree item that represents a label
 */
export default class LabelTreeItem extends TreeItem {
    public type: string;

    public contextValue = `${this.type}TreeItem`;

    constructor(
        label: string,
        public data: any,
        type: string,
        public children: (BuildPoolTreeItem | InfoTreeItem | JobGroupTreeItem | LabelTreeItem)[]
    ) {
        super(label, children ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);
        this.type = type || TreeItemType.Label;
    }
}
