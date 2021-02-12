import { commands, ExtensionContext, TreeView, window } from 'vscode';
import { Commands } from '../../../commands';
import { Views } from '../../../utils';
import AppServicesProvider from './provider';
import {
  AppServiceEndpointPathTreeItem,
  AppServiceTreeItem
} from './treeItems';

export default class AppServicesView {
  private treeDataProvider: AppServicesProvider;
  private view: TreeView<AppServiceTreeItem>;
  private defaultMessage: string;
  private instance: any;

  constructor(context: ExtensionContext) {
    this.treeDataProvider = new AppServicesProvider(context.extensionPath);
    this.view = window.createTreeView(Views.StreamsAppServices, {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true
    });
    context.subscriptions.push(this.view);

    const appServicesCommands =
      Commands.VIEW.STREAMS_EXPLORER.STREAMS_APP_SERVICES;
    // Service commands
    commands.registerCommand(
      appServicesCommands.OPEN_REST_API_DOC,
      (element: AppServiceTreeItem) => {
        element.openRestApiDoc();
      }
    );
    // Endpoint path commands
    commands.registerCommand(
      appServicesCommands.SEND_DATA,
      (element: AppServiceEndpointPathTreeItem) => {
        element.sendData();
      }
    );
    commands.registerCommand(
      appServicesCommands.RECEIVE_DATA,
      (element: AppServiceEndpointPathTreeItem) => {
        element.receiveData();
      }
    );
  }

  /**
   * Get the provider
   */
  public getProvider(): AppServicesProvider {
    return this.treeDataProvider;
  }

  /**
   * Refresh the view
   */
  public refresh(): void {
    if (this.instance) {
      this.treeDataProvider.generateTreeData(this.instance);
    }
    this.treeDataProvider.refresh();
  }

  /**
   * Show services for the selected instance item in the Instances view
   * @param instance the instance
   */
  public showServicesForInstance(instance: any): void {
    if (instance) {
      this.instance = instance;
      this.refresh();
    }
  }

  /**
   * Clear services
   */
  public clearServices(): void {
    this.instance = null;
    this.treeDataProvider.setTreeData(null);
    this.treeDataProvider.refresh();
  }
}
