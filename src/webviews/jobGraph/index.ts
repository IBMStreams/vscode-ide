import {
  addStreamsRequestAuth,
  InstanceSelector,
  store
} from '@ibmstreams/common';
import axios from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
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
import { EndpointPathAction } from '..';
import { Commands } from '../../commands';
import { StreamsInstance } from '../../streams';
import { BuiltInCommands, Configuration } from '../../utils';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

/**
 * Message command identifier
 */
enum MessageCommand {
  JobSelected = 'job-selected',
  CallStreamsRestApi = 'call-streams-rest-api',
  SaveFile = 'save-file',
  GetDynamicViews = 'get-dynamic-views',
  SetDynamicViews = 'set-dynamic-views',
  OpenCpdUrl = 'open-cpd-url',
  SendData = 'send-data',
  ReceiveData = 'receive-data'
}

interface IStreamsRestAPIRequestOptions<T> {
  endpoint: string;
  reserved: boolean;
  options: T;
}

interface ISaveFileOptions {
  fileName: string;
  fileContent: any;
  fileType: any;
  buttonLabel: string;
}

interface IDynamicViewOptions {
  key: string;
  value?: any;
}

interface IStreamsProperties {
  instance: any;
  instanceName: string;
  instanceType: string;
  instanceRestUrl: string;
  instanceRestReservedUrl: string;
  jobId: string;
  jobName?: string;
}

/**
 * Manages the webview panel for the Streams job graph
 */
export default class JobGraphPanel extends BaseWebviewPanel {
  public static panels: JobGraphPanel[] = [];
  public static panelIdCounter = 0;
  private static readonly type = WebviewType.JobGraph;
  private static readonly titlePrefix = 'Job Graph';

  /**
   * @param panel the webview panel
   * @param context the extension context
   * @param properties the Streams properties associated with the job
   */
  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private properties: IStreamsProperties
  ) {
    super(panel, context);
    this.currentPanelId = ++JobGraphPanel.panelIdCounter;
    this.setHtml();
  }

  /**
   * Create or show the webview
   * @param context the extension context
   * @param properties the Streams properties associated with the job
   */
  public static createOrShow(
    context: ExtensionContext,
    properties: IStreamsProperties
  ): void {
    // Show panel if it already exists
    const matchFn = (panel: JobGraphPanel): boolean =>
      panel.properties.instance.connectionId ===
        properties.instance.connectionId &&
      panel.properties.instanceName === properties.instanceName &&
      panel.properties.jobId === properties.jobId;
    const existingPanel = this.panels.find(matchFn);
    if (existingPanel) {
      existingPanel.currentPanel.panel.reveal(ViewColumn.Active);
      return;
    }

    // Otherwise, create a new panel
    const title =
      properties && properties.jobName
        ? `${
            properties.jobName.length > 30
              ? `${properties.jobName.substring(0, 29)}...`
              : properties.jobName
          }`
        : this.titlePrefix;
    const panel = super.createWebview(context.extensionPath, this.type, title);
    const jobGraphPanel = new JobGraphPanel(panel, context, properties);
    jobGraphPanel.setCurrentPanel(jobGraphPanel);
    this.panels.push(jobGraphPanel);
  }

  protected dispose(): void {
    JobGraphPanel.panels = JobGraphPanel.panels.filter(
      (panel: JobGraphPanel) =>
        panel.currentPanel.currentPanelId !== this.currentPanelId
    );
    this.currentPanel = undefined;
    super.dispose();
  }

  protected setHtml(): void {
    super.setHtml(this.properties);
  }

  protected handleMessage(message: RequestMessage<any>): any {
    switch (message.command) {
      case MessageCommand.JobSelected:
        return this.handleJobSelectedMessage(message);
      case MessageCommand.CallStreamsRestApi:
        return this.handleStreamsRestAPIMessage(message);
      case MessageCommand.SaveFile:
        return this.handleSaveFileMessage(message);
      case MessageCommand.GetDynamicViews:
        return this.handleGetDynamicViewsMessage(message);
      case MessageCommand.SetDynamicViews:
        return this.handleSetDynamicViewsMessage(message);
      case MessageCommand.OpenCpdUrl:
        return this.openCpdUrl(message);
      case MessageCommand.SendData:
        return this.sendData(message);
      case MessageCommand.ReceiveData:
        return this.receiveData(message);
      default:
        break;
    }
    return null;
  }

  /**
   * Make a request to the Streams REST API
   * @param endpoint the endpoint URL
   * @param reserved whether or not this is a reserved call (hidden, internal use only)
   * @param options the request options
   */
  private async callStreamsRestAPI(
    endpoint: string,
    reserved: boolean,
    options: any = {}
  ): Promise<any> {
    const {
      instance,
      instanceRestUrl,
      instanceRestReservedUrl
    } = this.properties;

    let config: any = {
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    };
    config = await addStreamsRequestAuth(
      store.getState(),
      instance.connectionId,
      config
    );

    // Check if we already have a complete URL
    if (endpoint.startsWith('http')) {
      config.url = endpoint;
    } else {
      config.url = endpoint;
      config.baseURL = reserved ? instanceRestReservedUrl : instanceRestUrl;
    }

    if (options.headers) {
      config.headers = { ...config.headers, ...options.headers };
      delete options.headers;
    }
    config = { ...config, ...options };
    return axios(config)
      .then((response) => {
        const { data, headers, status } = response;

        // If this is a job deletion and it was successful, refresh the instances in the Streams Explorer view
        if (
          options.method &&
          options.method.toLowerCase() === 'delete' &&
          endpoint.startsWith('jobs/') &&
          status === 204
        ) {
          setTimeout(() => StreamsInstance.refreshInstances(), 2000);
        }

        return { error: null, data, headers, status };
      })
      .catch((error) => {
        const serializedError: any = {};
        if (error.response) {
          serializedError.response = error.response;
          const keys = ['data', 'status', 'statusText'];
          Object.keys(serializedError.response).forEach((key) => {
            if (!keys.includes(key)) {
              delete serializedError.response[key];
            }
          });
        }
        if (error.messages) {
          serializedError.messages = error.messages;
        }
        return {
          error: serializedError,
          data: null,
          headers: null,
          status: null
        };
      });
  }

  /**
   * Handle a job selected message
   * @param message the JSON message sent from the webview
   */
  private handleJobSelectedMessage(message: RequestMessage<any>): void {
    const { args }: { args: { jobId: string; jobName: string } } = message;
    if (args) {
      const { jobId, jobName } = args;
      this.properties.jobId = jobId;
      // Change the webview panel title to the name of the selected job
      this.currentPanel.panel.title = `${
        jobName.length > 30 ? `${jobName.substring(0, 29)}...` : jobName
      }`;
    }
  }

  /**
   * Handle a Streams REST API message
   * @param message the JSON message sent from the webview
   */
  private async handleStreamsRestAPIMessage(
    message: RequestMessage<any>
  ): Promise<any> {
    const { args }: { args: IStreamsRestAPIRequestOptions<any> } = message;
    if (args) {
      const { endpoint, reserved = false, options = {} } = args;
      const response = await this.callStreamsRestAPI(
        endpoint,
        reserved,
        options
      );
      if (this.currentPanel) {
        super.replyMessage(message, response);
      }
    }
  }

  /**
   * Handle a save data message
   * @param message the JSON message sent from the webview
   */
  private async handleSaveFileMessage(
    message: RequestMessage<any>
  ): Promise<any> {
    const { args }: { args: ISaveFileOptions } = message;
    if (args) {
      const { fileName, fileContent, fileType, buttonLabel } = args;
      const options = {
        defaultUri: Uri.file(path.join(os.homedir(), fileName)),
        filters: fileType,
        saveLabel: buttonLabel
      };
      return window.showSaveDialog(options).then((uri: Uri) => {
        if (uri) {
          if (fs.existsSync(uri.fsPath)) {
            fs.unlinkSync(uri.fsPath);
          }
          fs.writeFileSync(uri.fsPath, fileContent);
          commands.executeCommand(BuiltInCommands.Open, uri);
        }
      });
    }
    return null;
  }

  /**
   * Handle a get dynamic views message
   * @param message the JSON message sent from the webview
   */
  private async handleGetDynamicViewsMessage(
    message: RequestMessage<any>
  ): Promise<any> {
    const { args }: { args: IDynamicViewOptions } = message;
    if (args) {
      const { key } = args;
      let value = Configuration.getState(key);
      // Set default value
      if (!value) {
        await Configuration.setState(key, []);
        value = Configuration.getState(key);
      }
      if (this.currentPanel) {
        super.replyMessage(message, value);
      }
    }
  }

  /**
   * Handle a set dynamic views message
   * @param message the JSON message sent from the webview
   */
  private async handleSetDynamicViewsMessage(
    message: RequestMessage<any>
  ): Promise<any> {
    const { args }: { args: IDynamicViewOptions } = message;
    if (args) {
      const { key, value } = args;
      await Configuration.setState(key, value);
      if (this.currentPanel) {
        super.replyMessage(message, null);
      }
    }
  }

  /**
   * Open a Cloud Pak for Data URL
   * @param message the JSON message sent from the webview
   */
  private async openCpdUrl(message: RequestMessage<any>): Promise<any> {
    const { args } = message;
    if (args) {
      const { messageId, ...params } = args;
      if (messageId === 'appServiceDocUrl') {
        const { jobId } = params;
        const { instance } = this.properties;
        const appService = InstanceSelector.selectCloudPakForDataAppService(
          store.getState(),
          instance.connectionId,
          jobId
        );
        if (appService && appService.apiViewer) {
          return env.openExternal(Uri.parse(appService.apiViewer));
        }
      }
    }
  }

  /**
   * Send data to a Streams application service
   * @param message the JSON message sent from the webview
   */
  private async sendData(message: RequestMessage<any>): Promise<any> {
    const { args } = message;
    if (args) {
      const { jobId, jobName, opName } = args;
      const { instance } = this.properties;
      const appService = InstanceSelector.selectCloudPakForDataAppService(
        store.getState(),
        instance.connectionId,
        jobId
      );
      if (appService) {
        const { paths } = appService.api;
        const pathNames = Object.keys(paths);
        const matchingPathName = pathNames.find((pathName: string) =>
          pathName.includes(opName)
        );
        if (matchingPathName) {
          commands.executeCommand(
            Commands.ENVIRONMENT.SHOW_CPD_APP_SERVICE_PANEL,
            instance.connectionId,
            jobName,
            appService.apiViewer,
            appService.api,
            matchingPathName,
            EndpointPathAction.Send
          );
        }
      }
    }
  }

  /**
   * Receive data from a Streams application service
   * @param message the JSON message sent from the webview
   */
  private async receiveData(message: RequestMessage<any>): Promise<any> {
    const { args } = message;
    if (args) {
      const { jobId, jobName, opName } = args;
      const { instance } = this.properties;
      const appService = InstanceSelector.selectCloudPakForDataAppService(
        store.getState(),
        instance.connectionId,
        jobId
      );
      if (appService) {
        const { paths } = appService.api;
        const pathNames = Object.keys(paths);
        const matchingPathName = pathNames.find((pathName: string) =>
          pathName.includes(opName)
        );
        if (matchingPathName) {
          commands.executeCommand(
            Commands.ENVIRONMENT.SHOW_CPD_APP_SERVICE_PANEL,
            instance.connectionId,
            jobName,
            appService.apiViewer,
            appService.api,
            matchingPathName,
            EndpointPathAction.Receive
          );
        }
      }
    }
  }
}
