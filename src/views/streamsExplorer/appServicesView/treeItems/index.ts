import AppServiceEndpointPathTreeItem from './appServiceEndpointPathTreeItem';
import AppServiceEndpointTagTreeItem from './appServiceEndpointTagTreeItem';
import AppServiceTreeItem from './appServiceTreeItem';

export enum TreeItemType {
  AppService = 'appService',
  AppServiceEndpointTag = 'appServiceEndpointTag',
  AppServiceEndpointPath = 'appServiceEndpointPath'
}

export {
  AppServiceEndpointPathTreeItem,
  AppServiceEndpointTagTreeItem,
  AppServiceTreeItem
};

export type AppServiceTreeItemType =
  | AppServiceTreeItem
  | AppServiceEndpointPathTreeItem
  | AppServiceEndpointTagTreeItem;
