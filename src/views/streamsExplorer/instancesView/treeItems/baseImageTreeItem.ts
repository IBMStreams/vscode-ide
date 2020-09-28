import * as path from 'path';
import {
    TreeItem, TreeItemCollapsibleState, Uri, window, workspace
} from 'vscode';
import { TreeItemType } from '.';
import StreamsBuild from '../../../../build';
import { Logger, VSCode } from '../../../../utils';

/**
 * Tree item that represents a base image
 */
export default class BaseImageTreeItem extends TreeItem {
    public type = TreeItemType.BaseImage;
    public children = null;

    public contextValue = `${this.type}TreeItem`;
    public iconPath = {
        light: path.join(this._extensionPath, 'images', 'icons', 'light', 'box.svg'),
        dark: path.join(this._extensionPath, 'images', 'icons', 'dark', 'box.svg')
    };

    constructor(
        private _extensionPath: string,
        public baseImage: any,
        private _instance: any
    ) {
        super(baseImage.name, TreeItemCollapsibleState.None);
        this.description = baseImage.tag;
    }

    /**
     * Build an image for the edge
     */
    public async buildImage(): Promise<void> {
        try {
            if (this.baseImage) {
                // Prompt user to pick application bundle file(s)
                const defaultFolderUri = workspace.workspaceFolders && workspace.workspaceFolders.length
                    ? workspace.workspaceFolders[0].uri
                    : null;
                const selectedUris = await window.showOpenDialog({
                    canSelectMany: true,
                    defaultUri: defaultFolderUri,
                    filters: { 'Streams Application Bundle': ['sab'] },
                    openLabel: 'Build image(s)'
                });
                if (selectedUris && selectedUris.length) {
                    const selectedFilePaths = selectedUris.map((uri: Uri) => uri.fsPath);
                    StreamsBuild.runBuildImage(this._instance, selectedFilePaths, this.baseImage);
                }
                return;
            }
            throw new Error();
        } catch (error) {
            Logger.error(null, 'Error building the image.', true);
            if (error.stack) {
                Logger.error(null, error.stack);
            }
        }
    }

    /**
     * Copy base image ID to the user's clipboard
     */
    public async copyId(): Promise<void> {
        try {
            if (this.baseImage) {
                await VSCode.copyToClipboard(this.baseImage.id);
                return;
            }
            throw new Error();
        } catch (error) {
            Logger.error(null, 'Error copying the ID for the base image.', true);
            if (error.stack) {
                Logger.error(null, error.stack);
            }
        }
    }
}
