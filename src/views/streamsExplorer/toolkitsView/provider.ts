import {
  EditorSelector,
  store,
  StreamsInstanceType,
  ToolkitUtils
} from '@ibmstreams/common';
import {
  Command,
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState
} from 'vscode';
import { Streams } from '../../../streams';
import { BuiltInCommands, Configuration, Settings } from '../../../utils';

const BUILD_SERVICE_TOOLKITS_LABEL = 'Build service';
const LOCAL_TOOLKITS_LABEL = 'Local';
const NO_BUILD_SERVICE_TOOLKITS_LABEL = 'No build service toolkits available';
const NO_LOCAL_TOOLKITS_LABEL = 'No local toolkits available';
const NO_TOOLKITS_LABEL = 'None available';

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
export default class ToolkitsProvider
  implements TreeDataProvider<ToolkitTreeItem> {
  private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
  public readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData
    .event;

  public getChildren(element?: ToolkitTreeItem): ToolkitTreeItem[] {
    return element
      ? element.children
      : this._createTreeItems(this._getToolkits());
  }

  public getTreeItem(element: ToolkitTreeItem): TreeItem {
    const {
      name,
      version,
      description,
      children,
      contextValue,
      command
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
    const buildServiceToolkits = ToolkitUtils.getCachedToolkits(
      EditorSelector.selectToolkitsCacheDir(store.getState())
    );

    const localToolkitPathsSetting = Configuration.getSetting(
      Settings.ENV_TOOLKIT_PATHS
    );
    let localToolkits = null;
    if (localToolkitPathsSetting && localToolkitPathsSetting.length > 0) {
      localToolkits = ToolkitUtils.getLocalToolkits(localToolkitPathsSetting);
    }

    return {
      [BUILD_SERVICE_TOOLKITS_LABEL]:
        buildServiceToolkits && buildServiceToolkits.length
          ? buildServiceToolkits
          : NO_BUILD_SERVICE_TOOLKITS_LABEL,
      [LOCAL_TOOLKITS_LABEL]:
        localToolkits && localToolkits.length
          ? localToolkits
          : NO_LOCAL_TOOLKITS_LABEL
    };
  }

  /**
   * Creates tree items from input data
   * @param data the data
   */
  private _createTreeItems(data: any): ToolkitTreeItem[] {
    if (typeof data === 'string') {
      if (data === NO_BUILD_SERVICE_TOOLKITS_LABEL) {
        const treeItem: ToolkitTreeItem = { name: NO_TOOLKITS_LABEL };
        if (
          Streams.getDefaultInstanceEnv() ===
          StreamsInstanceType.V4_STREAMING_ANALYTICS
        ) {
          treeItem.description =
            'When the default Streams instance is an IBM Streaming Analytics service on IBM Cloud, there will be no toolkits listed here.';
        }
        return [treeItem];
      }
      if (data === NO_LOCAL_TOOLKITS_LABEL) {
        return [
          {
            name: NO_TOOLKITS_LABEL,
            command: {
              title: '',
              command: BuiltInCommands.OpenSettings,
              arguments: [Settings.ENV_TOOLKIT_PATHS]
            }
          }
        ];
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
        description =
          'These toolkits are fetched from the build service associated with the default IBM Streams instance.';
        contextValue = 'buildService_label_toolkitTreeItem';
      } else if (label === LOCAL_TOOLKITS_LABEL) {
        description =
          'These toolkits are derived from the toolkit paths defined in the IBM Streams extension settings.';
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
