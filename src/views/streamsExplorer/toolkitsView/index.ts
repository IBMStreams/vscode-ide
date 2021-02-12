import { Registry } from '@ibmstreams/common';
import * as fs from 'fs';
import * as path from 'path';
import { commands, Uri, window } from 'vscode';
import { Commands } from '../../../commands';
import {
  BuiltInCommands,
  Configuration,
  Settings,
  Views
} from '../../../utils';
import ToolkitsProvider from './provider';

/**
 * Represents the Toolkits view
 */
export default class ToolkitsView {
  private _treeDataProvider: ToolkitsProvider;

  constructor() {
    this._treeDataProvider = new ToolkitsProvider();
    window.createTreeView(Views.StreamsToolkits, {
      treeDataProvider: this._treeDataProvider,
      showCollapseAll: true
    });

    const toolkitCommands = Commands.VIEW.STREAMS_EXPLORER.STREAMS_TOOLKITS;

    commands.registerCommand(
      toolkitCommands.REFRESH_TOOLKITS,
      (fullRefresh = true) => {
        this.refresh(fullRefresh);
      }
    );

    commands.registerCommand(toolkitCommands.EDIT_LOCAL_TOOLKITS, () => {
      commands.executeCommand(
        BuiltInCommands.OpenSettings,
        Settings.ENV_TOOLKIT_PATHS
      );
    });

    commands.registerCommand(toolkitCommands.ADD_TOOLKIT_PATH, async () => {
      const selectedFolderUri = await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Add toolkit path'
      });
      if (selectedFolderUri && selectedFolderUri.length) {
        const selectedFolderPath = selectedFolderUri[0].fsPath;
        const toolkitPathsSetting = Configuration.getSetting(
          Settings.ENV_TOOLKIT_PATHS
        );
        let newToolkitPathsSetting;
        if (toolkitPathsSetting === Settings.ENV_TOOLKIT_PATHS_DEFAULT) {
          newToolkitPathsSetting = selectedFolderPath;
        } else {
          const toolkitPaths = toolkitPathsSetting
            .split(/[,;]/)
            .map((toolkitPath) => toolkitPath.trim())
            .filter((toolkitPath) => toolkitPath !== '');
          if (toolkitPaths.includes(selectedFolderPath)) {
            Registry.getDefaultMessageHandler().logInfo(
              `The selected folder is already included in the toolkit paths: ${selectedFolderPath}.`,
              { showNotification: true }
            );
            return;
          }

          if (!toolkitPaths.length) {
            newToolkitPathsSetting = selectedFolderPath;
          } else if (toolkitPaths.length === 1) {
            newToolkitPathsSetting = `${toolkitPaths[0]}; ${selectedFolderPath}`;
          } else {
            if (toolkitPathsSetting.includes(',')) {
              newToolkitPathsSetting = `${toolkitPaths.join(
                ', '
              )}, ${selectedFolderPath}`;
            } else if (toolkitPathsSetting.includes(';')) {
              newToolkitPathsSetting = `${toolkitPaths.join(
                '; '
              )}; ${selectedFolderPath}`;
            }
          }
        }
        if (newToolkitPathsSetting) {
          await Configuration.setSetting(
            Settings.ENV_TOOLKIT_PATHS,
            newToolkitPathsSetting
          );
        }
      }
    });
    commands.registerCommand(toolkitCommands.REMOVE_TOOLKIT_PATHS, async () => {
      const toolkitPathsSetting = Configuration.getSetting(
        Settings.ENV_TOOLKIT_PATHS
      );
      if (
        toolkitPathsSetting === Settings.ENV_TOOLKIT_PATHS_DEFAULT ||
        toolkitPathsSetting.trim() === ''
      ) {
        Registry.getDefaultMessageHandler().logInfo(
          'There are no toolkit paths to remove.',
          { showNotification: true }
        );
        return;
      }

      const toolkitPaths = toolkitPathsSetting
        .split(/[,;]/)
        .map((toolkitPath) => toolkitPath.trim())
        .filter((toolkitPath) => toolkitPath !== '');
      const selectedToolkitPaths = await window.showQuickPick(toolkitPaths, {
        canPickMany: true,
        ignoreFocusOut: true,
        placeHolder: 'Select the toolkit path(s) to remove'
      });
      if (selectedToolkitPaths && selectedToolkitPaths.length) {
        const newToolkitPaths = toolkitPaths.filter(
          (toolkitPath) => !selectedToolkitPaths.includes(toolkitPath)
        );
        let newToolkitPathsSetting;
        if (!newToolkitPaths.length) {
          newToolkitPathsSetting = undefined;
        } else {
          newToolkitPathsSetting = toolkitPathsSetting.includes(',')
            ? newToolkitPaths.join(', ')
            : newToolkitPaths.join('; ');
        }
        await Configuration.setSetting(
          Settings.ENV_TOOLKIT_PATHS,
          newToolkitPathsSetting
        );
      }
    });

    commands.registerCommand(toolkitCommands.OPEN_TOOLKIT, (toolkit: any) => {
      const { isLocal, indexPath } = toolkit;
      if (indexPath && fs.existsSync(indexPath)) {
        if (isLocal) {
          commands.executeCommand(
            BuiltInCommands.OpenFolder,
            Uri.file(path.dirname(indexPath)),
            true
          );
        } else {
          commands.executeCommand(BuiltInCommands.Open, Uri.file(indexPath));
        }
      }
    });

    commands.registerCommand(toolkitCommands.VIEW_TOOLKIT, (toolkit: any) => {
      const { isLocal, indexPath } = toolkit;
      if (indexPath && fs.existsSync(indexPath)) {
        commands.executeCommand(
          BuiltInCommands.RevealFileInOS,
          Uri.file(isLocal ? path.dirname(indexPath) : indexPath)
        );
      }
    });
  }

  /**
   * Refresh the view
   * @param fullRefresh whether or not to fetch toolkits from the build service
   */
  public async refresh(fullRefresh: boolean): Promise<void> {
    if (fullRefresh) {
      await commands.executeCommand(Commands.ENVIRONMENT.TOOLKITS_REFRESH);
    } else {
      this._treeDataProvider.refresh();
    }
  }
}
