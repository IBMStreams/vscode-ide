import { Registry } from '@ibmstreams/common';
import * as path from 'path';
import {
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace
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

  constructor(
    private _extensionPath: string,
    public baseImage: any,
    public instance: any
  ) {
    super(baseImage.name, TreeItemCollapsibleState.None);

    // Set context value
    this.contextValue = `${this.type}TreeItem`;

    // Set description
    this.description = baseImage.tag;

    // Set icon path
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    const iconFileName = 'box.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };
  }

  /**
   * Build an image for the edge
   */
  public async buildImage(): Promise<void> {
    try {
      if (this.baseImage) {
        // Prompt user to pick application bundle file(s)
        const defaultFolderUri =
          workspace.workspaceFolders && workspace.workspaceFolders.length
            ? workspace.workspaceFolders[0].uri
            : null;
        const selectedUris = await window.showOpenDialog({
          canSelectMany: true,
          defaultUri: defaultFolderUri,
          filters: { 'Streams Application Bundle': ['sab'] },
          openLabel: 'Build image(s) from application bundle(s)'
        });
        if (selectedUris && selectedUris.length) {
          const selectedFilePaths = selectedUris.map((uri: Uri) => uri.fsPath);
          const {
            messageHandlerIds,
            bundleFilePaths
          } = StreamsBuild.initBuildImage(selectedFilePaths);
          StreamsBuild.runBuildImage(
            this.instance,
            bundleFilePaths,
            this.baseImage,
            messageHandlerIds
          );
        }
        return;
      }
      throw new Error();
    } catch (error) {
      Registry.getDefaultMessageHandler().logError(
        'Error building the image.',
        { showNotification: true }
      );
      if (error.stack) {
        Registry.getDefaultMessageHandler().logError(error.stack);
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
      Registry.getDefaultMessageHandler().logError(
        'Error copying the ID for the base image.',
        { showNotification: true }
      );
      if (error.stack) {
        Registry.getDefaultMessageHandler().logError(error.stack);
      }
    }
  }
}
