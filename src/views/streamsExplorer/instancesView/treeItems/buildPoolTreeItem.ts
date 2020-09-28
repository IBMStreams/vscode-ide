import * as path from 'path';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { LabelTreeItem, TreeItemType } from '.';

/**
 * Tree item that represents a build pool
 */
export default class BuildPoolTreeItem extends TreeItem {
    public type = TreeItemType.BuildPool;

    public contextValue = `${this.type}TreeItem`;
    public iconPath = {
        light: path.join(this._extensionPath, 'images', 'icons', 'light', 'network--1.svg'),
        dark: path.join(this._extensionPath, 'images', 'icons', 'dark', 'network--1.svg')
    };

    constructor(
        private _extensionPath: string,
        public buildPool: any,
        public children: (LabelTreeItem)[]
    ) {
        super(buildPool.name, children ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);
    }
}
