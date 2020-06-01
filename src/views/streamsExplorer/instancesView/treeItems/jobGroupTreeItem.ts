import * as path from 'path';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { InfoTreeItem, JobTreeItem } from '.';

/**
 * Tree item that represents a Streams job group
 */
export default class JobGroupTreeItem extends TreeItem {
    public type = 'jobGroup';

    constructor(
        private _extensionPath: string,
        name: string,
        public children: (InfoTreeItem | JobTreeItem)[]
    ) {
        super(name, children ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);
    }

    public contextValue = 'jobGroupTreeItem';

    public tooltip = 'Job Group';

    public iconPath = {
        light: path.join(this._extensionPath, 'images', 'icons', 'light', 'folder.svg'),
        dark: path.join(this._extensionPath, 'images', 'icons', 'dark', 'folder.svg')
    };
}
