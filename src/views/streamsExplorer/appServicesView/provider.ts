import { InstanceSelector, store } from '@ibmstreams/common';
import * as path from 'path';
import { Event, EventEmitter, TreeDataProvider, TreeItem } from 'vscode';
import { BuiltInCommands, Views } from '../../../utils';
import {
  AppServiceEndpointPathTreeItem,
  AppServiceEndpointTagTreeItem,
  AppServiceTreeItem,
  AppServiceTreeItemType
} from './treeItems';

export default class AppServicesProvider
  implements TreeDataProvider<AppServiceTreeItemType> {
  private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
  readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;
  private infoIconPath: any;
  private defaultMessage =
    'Select a Cloud Pak for Data instance with version 3.5 or greater in the Instances view to display its application services.';
  private treeDataMessage: TreeItem;
  private treeData: AppServiceTreeItemType[];

  constructor(private extensionPath: string) {
    this.treeData = null;
    this.infoIconPath = {
      light: path.join(
        extensionPath,
        'images',
        'icons',
        'light',
        'information.svg'
      ),
      dark: path.join(
        extensionPath,
        'images',
        'icons',
        'dark',
        'information.svg'
      )
    };
    this.treeDataMessage = {
      label: this.defaultMessage,
      iconPath: this.infoIconPath,
      command: {
        title: '',
        command: `${Views.StreamsInstances}.${BuiltInCommands.ShowView}`,
        arguments: null
      }
    };
  }

  public getChildren(
    element: AppServiceTreeItemType
  ): AppServiceTreeItemType[] {
    return element ? element.children : this.treeData || [this.treeDataMessage];
  }

  public getTreeItem(element: AppServiceTreeItemType): TreeItem {
    return element;
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Set tree data
   * @param data the tree data
   */
  public setTreeData(data: any): void {
    this.treeData = data;
  }

  /**
   * Generate tree data
   * @param instance the instance
   */
  public generateTreeData(instance: any): AppServiceTreeItemType[] {
    if (!instance) {
      return;
    }
    const appServices = InstanceSelector.selectCloudPakForDataStreamsApplicationServices(
      store.getState(),
      instance.connectionId
    );
    if (!appServices.length) {
      this.treeData = null;
      const instanceName = InstanceSelector.selectInstanceName(
        store.getState(),
        instance.connectionId
      );
      this.setMessage(
        `There are no application services for the instance ${instanceName}.`
      );
    } else {
      this.treeData = appServices.map((appService: any) => {
        // Group endpoint paths from the service API by tag
        const { paths } = appService.api;
        const docTag = 'Documentation';
        const groupedPathsByTag = Object.keys(paths).reduce(function (
          tagMap,
          path
        ) {
          const pathObj = paths[path];
          let tags = [];
          if (pathObj.get) {
            ({ tags } = pathObj.get);
          } else if (pathObj.post) {
            ({ tags } = pathObj.post);
          }
          if (tags.includes(docTag)) {
            return tagMap;
          }
          tags.forEach((tag) => {
            if (!tagMap[tag]) {
              tagMap[tag] = [];
            }
            tagMap[tag].push({ path, pathObj });
          });
          return tagMap;
        },
        {});

        // Map endpoint paths to tree items
        const endpointTreeItems = Object.keys(groupedPathsByTag)
          .sort((a, b) => a.localeCompare(b))
          .map((tag) => {
            const endpointTreeItems = groupedPathsByTag[tag].map(
              ({ path, pathObj }) =>
                new AppServiceEndpointPathTreeItem(
                  this.extensionPath,
                  instance,
                  appService,
                  {
                    path,
                    pathObj
                  }
                )
            );
            return new AppServiceEndpointTagTreeItem(
              this.extensionPath,
              instance,
              tag,
              appService,
              endpointTreeItems
            );
          });
        return new AppServiceTreeItem(
          this.extensionPath,
          instance,
          appService,
          endpointTreeItems
        );
      });
      this.setMessage(this.defaultMessage);
    }

    this.refresh();
  }

  /**
   * Set view message
   * @param message the message
   */
  public setMessage(message?: string): void {
    this.treeDataMessage.label = message || this.defaultMessage;
  }
}
