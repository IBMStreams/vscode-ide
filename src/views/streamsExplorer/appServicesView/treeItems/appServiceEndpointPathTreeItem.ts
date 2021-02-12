import * as path from 'path';
import { commands, TreeItem, TreeItemCollapsibleState, window } from 'vscode';
import { TreeItemType } from '.';
import { Commands } from '../../../../commands';
import { EndpointPathAction } from '../../../../webviews';

enum EndpointType {
  Get = 'Get',
  Post = 'Post'
}

export default class AppServiceEndpointPathTreeItem extends TreeItem {
  public type = TreeItemType.AppServiceEndpointPath;
  public children = null;

  constructor(
    public readonly extensionPath: string,
    public readonly instance: any,
    public readonly service,
    public readonly serviceEndpointPath
  ) {
    super(
      `.../${serviceEndpointPath.path.split('/').slice(-3).join('/')}`,
      TreeItemCollapsibleState.None
    );

    // Set context value
    this.contextValue = `${this.endpointType.toLowerCase()}_${
      this.type
    }TreeItem`;

    // Set icon path
    const iconsFolderPath = [this.extensionPath, 'images', 'icons'];
    const iconFileName =
      this.endpointType === EndpointType.Get ? 'get.svg' : 'post.svg';
    this.iconPath = {
      light: path.join(...iconsFolderPath, 'light', iconFileName),
      dark: path.join(...iconsFolderPath, 'dark', iconFileName)
    };

    // Set tooltip
    const method = this.endpointType === EndpointType.Get ? 'GET' : 'POST';
    const description =
      serviceEndpointPath.pathObj?.get?.description ||
      serviceEndpointPath.pathObj?.post?.description;
    const summary =
      serviceEndpointPath.pathObj?.get?.summary ||
      serviceEndpointPath.pathObj?.post?.summary;
    this.tooltip = `Streams application service endpoint path\n\nMethod: ${method}\nPath: ${
      serviceEndpointPath.path
    }${
      summary && summary.trim() !== ''
        ? `\n<strong>Summary</strong>: ${summary}`
        : ''
    }${
      description && description.trim() !== ''
        ? `\nDescription: ${description}`
        : ''
    }`;
  }

  /**
   * Endpoint type
   */
  public get endpointType(): EndpointType {
    return this.serviceEndpointPath.pathObj.get
      ? EndpointType.Get
      : EndpointType.Post;
  }

  /**
   * Send data to the Streams job
   */
  public async sendData(): Promise<string> {
    return commands.executeCommand(
      Commands.ENVIRONMENT.SHOW_CPD_APP_SERVICE_PANEL,
      this.instance.connectionId,
      this.service.parameters.jobName,
      this.service.apiViewer,
      this.service.api,
      this.serviceEndpointPath.path,
      EndpointPathAction.Send
    );
  }

  /**
   * Receive data from the Streams job
   */
  public async receiveData(): Promise<string> {
    return commands.executeCommand(
      Commands.ENVIRONMENT.SHOW_CPD_APP_SERVICE_PANEL,
      this.instance.connectionId,
      this.service.parameters.jobName,
      this.service.apiViewer,
      this.service.api,
      this.serviceEndpointPath.path,
      EndpointPathAction.Receive
    );
  }
}
