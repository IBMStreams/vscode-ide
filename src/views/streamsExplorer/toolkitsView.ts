import { EditorSelector, store, StreamsInstanceType, ToolkitUtils } from '@ibmstreams/common';
import {
    Command, commands, Event, EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState, window
} from 'vscode';
import { Commands } from '../../commands';
import { Streams } from '../../streams';
import { BuiltInCommands, Configuration, Settings, Views } from '../../utils';

const BUILD_SERVICE_TOOLKITS_LABEL = 'Build service';
const LOCAL_TOOLKITS_LABEL = 'Local';
const NO_BUID_SERVICE_TOOLKITS_LABEL = 'No build service toolkits available';
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
    readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;

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
        let buildServiceToolkits = ToolkitUtils.getCachedToolkits(EditorSelector.selectToolkitsCacheDir(store.getState()))
            .map((tk: any) => tk.label);
        buildServiceToolkits = this._parseToolkitStrings(buildServiceToolkits);

        const localToolkitPathsSetting = Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS);
        let localToolkits = null;
        if (localToolkitPathsSetting && localToolkitPathsSetting.length > 0) {
            localToolkits = ToolkitUtils.getLocalToolkits(localToolkitPathsSetting).map((tk: any) => tk.label);
            localToolkits = this._parseToolkitStrings(localToolkits);
        }

        return {
            [BUILD_SERVICE_TOOLKITS_LABEL]: buildServiceToolkits && buildServiceToolkits.length ? buildServiceToolkits : NO_BUID_SERVICE_TOOLKITS_LABEL,
            [LOCAL_TOOLKITS_LABEL]: localToolkits && localToolkits.length ? localToolkits : NO_LOCAL_TOOLKITS_LABEL
        };
    }

    /**
     * Parse toolkit strings
     * @param toolkits    Toolkits to parse
     */
    private _parseToolkitStrings(toolkits: string[]): {name: string, version: string}[] {
        if (!toolkits) {
            return [];
        }
        return toolkits.map((toolkit: string) => {
            const regex = /([a-zA-Z\\.]+)\s-\s([\d\\.]+)/g;
            const matches = regex.exec(toolkit);
            if (matches && matches.length >= 3) {
                return {
                    name: matches[1],
                    version: matches[2]
                };
            }
            return {
                name: null,
                version: null
            };
        });
    }

    /**
     * Creates tree items from input data
     * @param data    The data
     */
    private _createTreeItems(data: any): ToolkitTreeItem[] {
        if (typeof data === 'string') {
            if (data === NO_BUID_SERVICE_TOOLKITS_LABEL) {
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
                name: toolkit.name,
                version: toolkit.version
            }));
        }
        return Object.keys(data).map((label): any => {
            const value = data[label];
            let description = null;
            let contextValue = null;
            if (label === BUILD_SERVICE_TOOLKITS_LABEL) {
                description = 'These toolkits are fetched from the build service associated with the default IBM Streams instance.';
            } else if (label === LOCAL_TOOLKITS_LABEL) {
                description = 'These toolkits are derived from the toolkit paths defined in the IBM Streams extension settings.';
                contextValue = 'local_toolkitTreeItem';
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
