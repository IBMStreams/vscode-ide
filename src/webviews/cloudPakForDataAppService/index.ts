import {
  InstanceSelector,
  Registry,
  receiveDataFromStreamsApplicationServiceEndpoint,
  sendDataToStreamsApplicationServiceEndpoint,
  store
} from '@ibmstreams/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  commands,
  env,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window
} from 'vscode';
import { BuiltInCommands, VSCode } from '../../utils';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

/**
 * Message command identifier
 */
enum MessageCommand {
  ClosePanel = 'close-panel',
  ExportFile = 'export-file',
  ImportFile = 'import-file',
  OpenServiceApiUrl = 'open-service-api-url',
  ReceiveData = 'receive-data',
  SendData = 'send-data'
}

/**
 * Endpoint path action
 */
export enum EndpointPathAction {
  Send = 'send',
  Receive = 'receive'
}

/**
 * File type
 */
enum FileType {
  CSV = 'csv',
  JSON = 'json'
}

/**
 * Manages the webview panel for a Cloud Pak for Data Streams application service.
 */
export class CloudPakForDataAppServicePanel extends BaseWebviewPanel {
  public static panels: CloudPakForDataAppServicePanel[] = [];
  public static panelIdCounter = 0;
  private static readonly type = WebviewType.CloudPakForDataAppService;

  /**
   * @param panel the webview panel
   * @param context the extension context
   * @param connectionId the target Streams instance connection identifier
   */
  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private connectionId: string,
    private jobName: string,
    private serviceApiUrl: string,
    private serviceApi: any,
    private serviceEndpointPath: string,
    private serviceEndpointPathAction: EndpointPathAction
  ) {
    super(panel, context);
    this.setHtml();
  }

  /**
   * Create or show the webview
   * @param context the extension context
   * @param connectionId the target Streams instance connection identifier
   */
  public static createOrShow(
    context: ExtensionContext,
    connectionId: string,
    jobName: string,
    serviceApiUrl: string,
    serviceApi: any,
    serviceEndpointPath: string,
    serviceEndpointPathAction: EndpointPathAction
  ): void {
    let title =
      serviceEndpointPathAction === EndpointPathAction.Send
        ? 'Send data'
        : 'Receive data';
    title += `: ${
      path.basename(jobName).length > 30
        ? `${path.basename(jobName).substring(0, 29)}...`
        : path.basename(jobName)
    }`;
    // Show the panel if it already exists
    const matchFn = (panel: CloudPakForDataAppServicePanel): boolean =>
      panel.connectionId === connectionId &&
      panel.jobName === jobName &&
      panel.serviceApiUrl === serviceApiUrl &&
      panel.serviceEndpointPath === serviceEndpointPath &&
      panel.serviceEndpointPathAction === serviceEndpointPathAction;
    const existingPanel = this.panels.find(matchFn);
    if (existingPanel) {
      existingPanel.currentPanel.panel.reveal(ViewColumn.Active);
      return;
    }

    // Otherwise, create a new panel
    const panel = super.createWebview(context.extensionPath, this.type, title);
    const cloudPakForDataAppServicePanel = new CloudPakForDataAppServicePanel(
      panel,
      context,
      connectionId,
      jobName,
      serviceApiUrl,
      serviceApi,
      serviceEndpointPath,
      serviceEndpointPathAction
    );
    cloudPakForDataAppServicePanel.setCurrentPanel(
      cloudPakForDataAppServicePanel
    );
    this.panels.push(cloudPakForDataAppServicePanel);
  }

  protected dispose(): void {
    CloudPakForDataAppServicePanel.panels = CloudPakForDataAppServicePanel.panels.filter(
      (panel: CloudPakForDataAppServicePanel) =>
        panel.currentPanel.currentPanelId !== this.currentPanelId
    );
    this.currentPanel = undefined;
    super.dispose();
  }

  protected async setHtml(): Promise<void> {
    const params = {
      fullPanelTitle: this.jobName,
      serviceApi: this.serviceApi,
      serviceEndpointPath: this.serviceEndpointPath,
      action: this.serviceEndpointPathAction
    };
    super.setHtml(params);
  }

  protected handleMessage(message: RequestMessage<any>): any {
    switch (message.command) {
      case MessageCommand.ClosePanel:
        return this.handleClosePanelMessage();
      case MessageCommand.ExportFile:
        return this.exportFile(message);
      case MessageCommand.ImportFile:
        return this.importFile(message);
      case MessageCommand.OpenServiceApiUrl:
        return this.openServiceApiUrl();
      case MessageCommand.ReceiveData:
        return this.receiveData(message);
      case MessageCommand.SendData:
        return this.sendData(message);
      default:
        break;
    }
    return null;
  }

  /**
   * Close the webview panel
   */
  private handleClosePanelMessage(): void {
    super.close(this.currentPanel);
  }

  /**
   * Import file containing tuples
   * @param message the JSON message sent from the webview
   */
  private importFile(message: RequestMessage<any>): Thenable<any> {
    const options = {
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { Data: ['json', 'csv'] },
      openLabel: 'Import data'
    };
    return window.showOpenDialog(options).then((uris: Uri[]) => {
      if (uris && uris.length) {
        const filePath = uris[0].fsPath;
        const fileContents = fs.readFileSync(filePath, 'utf8');
        return super.replyMessage(message, {
          fileContents,
          fileType:
            path.extname(filePath) === `.${FileType.JSON}`
              ? FileType.JSON
              : FileType.CSV
        });
      }
      return super.replyMessage(message, null);
    });
  }

  /**
   * Export file containing tuples
   * @param message the JSON message sent from the webview
   */
  private async exportFile(message: RequestMessage<any>): Promise<any> {
    const { args } = message;
    if (args) {
      const { fileContents, fileType } = args;
      const fileName = `${this.serviceApi.info.title.replace(
        /::/g,
        '_'
      )}_${Date.now()}.${fileType}`;
      const uri = await VSCode.showSaveDialog(
        'Export data',
        null,
        fileName,
        null
      );
      if (uri) {
        const filePath = uri.fsPath;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        fs.writeFileSync(filePath, fileContents);
        const instanceName = InstanceSelector.selectInstanceName(
          store.getState(),
          this.connectionId
        );
        Registry.getDefaultMessageHandler().logInfo(
          `The ${fileType.toUpperCase()} data for the ${
            this.serviceApi.info.title
          } in the Streams instance ${instanceName} was successfully exported.`,
          {
            detail: filePath,
            notificationButtons: [
              {
                label: 'Copy Path',
                callbackFn: async (): Promise<void> =>
                  VSCode.copyToClipboard(filePath)
              }
            ]
          }
        );

        // Open file
        commands.executeCommand(BuiltInCommands.Open, Uri.file(filePath));
      }
      return null;
    }
  }

  /**
   * Send data to an EndpointSource operator
   * @param message the JSON message sent from the webview
   */
  private async sendData(message: RequestMessage<any>): Promise<any> {
    const { args } = message;
    if (args) {
      let reply = {};
      try {
        const { data } = args;
        const { status, data: responseData } = await store.dispatch(
          sendDataToStreamsApplicationServiceEndpoint(
            this.connectionId,
            this.serviceEndpointPath,
            data
          )
        );
        reply = { status, data: responseData, error: null };
      } catch (err) {
        reply = this.handleRequestError(err);
      }
      return super.replyMessage(message, reply);
    }
  }

  /**
   * Receive data from an EndpointSink operator
   * @param message the JSON message sent from the webview
   */
  private async receiveData(message: RequestMessage<any>): Promise<any> {
    let reply = {};
    try {
      const { status, data } = await store.dispatch(
        receiveDataFromStreamsApplicationServiceEndpoint(
          this.connectionId,
          this.serviceEndpointPath
        )
      );
      reply = { status, data, error: null };
    } catch (err) {
      reply = this.handleRequestError(err);
    }
    return super.replyMessage(message, reply);
  }

  /**
   * Open the service API documentation in a browser
   */
  private openServiceApiUrl(): Thenable<any> {
    return env.openExternal(Uri.parse(this.serviceApiUrl));
  }

  /**
   * Handle a request error
   * @param error the error object
   */
  private handleRequestError(error: any): { status: string; error: string } {
    let reply;
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      reply = {
        status,
        data,
        error: data?.messages?.length ? data?.messages?.[0]?.message : null
      };
    } else if (error.request) {
      reply = {
        status: null,
        data: null,
        error: 'The request was made but no response was retrieved.'
      };
    } else {
      reply = {
        status: null,
        data: null,
        error:
          'Something happened in setting up the request that triggered an error.'
      };
    }
    return reply;
  }
}
