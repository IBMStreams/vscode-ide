import { EditorSelector, store, StreamsInstanceType, ToolkitUtils } from '@ibmstreams/common';
import * as fs from 'fs';
 import * as path from 'path';
import {
    Command, commands, Event, EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, window
} from 'vscode';
import { Commands } from '../../commands';
import { Streams } from '../../streams';
import {
 BuiltInCommands, Configuration, Logger, Settings, Views
} from '../../utils';

const BUILD_SERVICE_TOOLKITS_LABEL = 'Build service';
const LOCAL_TOOLKITS_LABEL = 'Local';
const NO_BUILD_SERVICE_TOOLKITS_LABEL = 'No build service toolkits available';
const NO_LOCAL_TOOLKITS_LABEL = 'No local toolkits available';
const NO_TOOLKITS_LABEL = 'None available';

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
        commands.registerCommand(toolkitCommands.REFRESH_TOOLKITS, (fullRefresh = true) => {
            this.refresh(fullRefresh);
        });
        commands.registerCommand(toolkitCommands.EDIT_LOCAL_TOOLKITS, () => {
            commands.executeCommand(BuiltInCommands.OpenSettings, Settings.ENV_TOOLKIT_PATHS);
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
                const toolkitPathsSetting = Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS);
                let newToolkitPathsSetting;
                if (toolkitPathsSetting === Settings.ENV_TOOLKIT_PATHS_DEFAULT) {
                    newToolkitPathsSetting = selectedFolderPath;
                } else {
                    const toolkitPaths = toolkitPathsSetting
                        .split(/[,;]/)
                        .map((toolkitPath) => toolkitPath.trim())
                        .filter((toolkitPath) => toolkitPath !== '');
                    if (toolkitPaths.includes(selectedFolderPath)) {
                        Logger.info(null, `The selected folder is already included in the toolkit paths: ${selectedFolderPath}.`);
                        return;
                    }

                    if (!toolkitPaths.length) {
                        newToolkitPathsSetting = selectedFolderPath;
                    } else if (toolkitPaths.length === 1) {
                        newToolkitPathsSetting = `${toolkitPaths[0]}; ${selectedFolderPath}`;
                    } else {
                        if (toolkitPathsSetting.includes(',')) {
                            newToolkitPathsSetting = `${toolkitPaths.join(', ')}, ${selectedFolderPath}`;
                        } else if (toolkitPathsSetting.includes(';')) {
                            newToolkitPathsSetting = `${toolkitPaths.join('; ')}; ${selectedFolderPath}`;
                        }
                    }
                }
                if (newToolkitPathsSetting) {
                    await Configuration.setSetting(Settings.ENV_TOOLKIT_PATHS, newToolkitPathsSetting);
                }
            }
        });
        commands.registerCommand(toolkitCommands.REMOVE_TOOLKIT_PATHS, async () => {
            const toolkitPathsSetting = Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS);
            if (toolkitPathsSetting === Settings.ENV_TOOLKIT_PATHS_DEFAULT || toolkitPathsSetting.trim() === '') {
                Logger.info(null, 'There are no toolkit paths to remove.');
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
            })
            if (selectedToolkitPaths && selectedToolkitPaths.length) {
                const newToolkitPaths = toolkitPaths.filter((toolkitPath) => !selectedToolkitPaths.includes(toolkitPath));
                let newToolkitPathsSetting;
                if (!newToolkitPaths.length) {
                    newToolkitPathsSetting = undefined;
                } else {
                    newToolkitPathsSetting = toolkitPathsSetting.includes(',') ? newToolkitPaths.join(', ') : newToolkitPaths.join('; ');
                }
                await Configuration.setSetting(Settings.ENV_TOOLKIT_PATHS, newToolkitPathsSetting);
            }
        });
        commands.registerCommand(toolkitCommands.OPEN_TOOLKIT, (toolkit: any) => {
            const { isLocal, indexPath } = toolkit;
            if (indexPath && fs.existsSync(indexPath)) {
                if (isLocal) {
                    commands.executeCommand(BuiltInCommands.OpenFolder, Uri.file(path.dirname(indexPath)), true);
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
     * @param fullRefresh    Whether or not to fetch toolkits from the build service
     */
    public async refresh(fullRefresh: boolean): Promise<void> {
        if (fullRefresh) {
            await commands.executeCommand(Commands.ENVIRONMENT.TOOLKITS_REFRESH);
        } else {
            this._treeDataProvider.refresh();
        }
    }
}

/**
 * Tree item that represents a toolkit
 */
interface ToolkitTreeItem {
    name: string;
    version?: string;
    description?: string;
    children?: ToolkitTreeItem[] | null;
    contextValue?: string;
    command?: Command;
}

/**
 * A tree data provider that provides toolkit data
 */
class ToolkitsProvider implements TreeDataProvider<ToolkitTreeItem> {
    private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
    public readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;

    public getChildren(element?: ToolkitTreeItem): ToolkitTreeItem[] {
        return element ? element.children : this._createTreeItems(this._getToolkits());
    }

    public getTreeItem(element: ToolkitTreeItem): TreeItem {
        const {
            name, version, description, children, contextValue, command
        } = element;
        return {
            label: name,
            description: version || null,
            tooltip: description || null,
            collapsibleState: children
                ? TreeItemCollapsibleState.Expanded
                : TreeItemCollapsibleState.None,
            contextValue: contextValue || null,
            command: command || null
        };
    }

    /**
     * Refresh the view
     */
    public refresh(): void {
        // This calls getChildren
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get the build service and local toolkits
     */
    private _getToolkits(): any {
        const buildServiceToolkits = ToolkitUtils.getCachedToolkits(EditorSelector.selectToolkitsCacheDir(store.getState()));

        const localToolkitPathsSetting = Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS);
        let localToolkits = null;
        if (localToolkitPathsSetting && localToolkitPathsSetting.length > 0) {
            localToolkits = ToolkitUtils.getLocalToolkits(localToolkitPathsSetting);
        }

        return {
            [BUILD_SERVICE_TOOLKITS_LABEL]: buildServiceToolkits && buildServiceToolkits.length ? buildServiceToolkits : NO_BUILD_SERVICE_TOOLKITS_LABEL,
            [LOCAL_TOOLKITS_LABEL]: localToolkits && localToolkits.length ? localToolkits : NO_LOCAL_TOOLKITS_LABEL
        };
    }

    /**
     * Creates tree items from input data
     * @param data    The data
     */
    private _createTreeItems(data: any): ToolkitTreeItem[] {
        if (typeof data === 'string') {
            if (data === NO_BUILD_SERVICE_TOOLKITS_LABEL) {
                const treeItem: ToolkitTreeItem = { name: NO_TOOLKITS_LABEL };
                if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V4_STREAMING_ANALYTICS) {
                    treeItem.description = 'When the default Streams instance is an IBM Streaming Analytics service on IBM Cloud, there will be no toolkits listed here.';
                }
                return [treeItem];
            }
            if (data === NO_LOCAL_TOOLKITS_LABEL) {
                return [{
                    name: NO_TOOLKITS_LABEL,
                    command: {
                        title: '',
                        command: BuiltInCommands.OpenSettings,
                        arguments: [Settings.ENV_TOOLKIT_PATHS]
                    }
                }];
            }
            return [{ name: data }];
        }
        if (Array.isArray(data)) {
            return data.map((toolkit: any) => ({
                ...toolkit,
                contextValue: 'toolkitTreeItem'
            }));
        }
        return Object.keys(data).map((label): any => {
            const value = data[label];
            let description = null;
            let contextValue = null;
            if (label === BUILD_SERVICE_TOOLKITS_LABEL) {
                description = 'These toolkits are fetched from the build service associated with the default IBM Streams instance.';
                contextValue = 'buildService_label_toolkitTreeItem';
            } else if (label === LOCAL_TOOLKITS_LABEL) {
                description = 'These toolkits are derived from the toolkit paths defined in the IBM Streams extension settings.';
                contextValue = 'local_label_toolkitTreeItem';
            }
            return {
                name: label,
                description,
                children: this._createTreeItems(value),
                contextValue
            };
        });
    }
}
