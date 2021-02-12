import {
  CloudPakForDataAuthType,
  Editor,
  Instance,
  InstanceSelector,
  Registry,
  store,
  StreamsInstanceType,
  ToolkitUtils
} from '@ibmstreams/common';
import _cloneDeep from 'lodash/cloneDeep';
import { ExtensionContext, ViewColumn, WebviewPanel } from 'vscode';
import { waitForLanguageClientReady } from '../../languageClient';
import { CPD_VERSION, Streams, STREAMS_ENV } from '../../streams';
import { getStreamsExplorer } from '../../views';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

/**
 * Message command identifier
 */
enum MessageCommand {
  ClosePanel = 'close-panel',
  TestConnection = 'test-connection',
  Authenticate = 'authenticate',
  SetSelectedInstance = 'set-selected-instance',
  RemoveInstance = 'remove-instance',
  StartStreamingAnalyticsService = 'start-streaming-analytics-service'
}

/**
 * Manages the webview panel for Streams authentication
 */
export default class StreamsAuthenticationPanel extends BaseWebviewPanel {
  public static panels: StreamsAuthenticationPanel[] = [];
  public static panelIdCounter = 0;
  private static readonly type = WebviewType.StreamsAuthentication;
  private static readonly addTitle = 'Add IBM Streams instance';
  private static readonly authTitle = 'Authenticate to IBM Streams instance';

  /**
   * @param panel the webview panel
   * @param context the extension context
   * @param existingInstance the existing instance
   * @param queuedActionId the queued action identifier
   */
  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private existingInstance: any,
    private queuedActionId: string,
    private authType: string
  ) {
    super(panel, context);
    this.currentPanelId = ++StreamsAuthenticationPanel.panelIdCounter;
    this.setHtml();
  }

  /**
   * Create or show the webview
   * @param context the extension context
   * @param env the Streams environment
   * @param existingInstance the existing instance
   * @param queuedActionId the queued action identifier
   */
  public static createOrShow(
    context: ExtensionContext,
    existingInstance: any,
    queuedActionId: string
  ): void {
    // Show panel if it already exists
    const matchFn = existingInstance
      ? (panel: StreamsAuthenticationPanel): boolean =>
          panel.existingInstance &&
          panel.existingInstance.connectionId === existingInstance.connectionId
      : (panel: StreamsAuthenticationPanel): boolean =>
          panel.panel.title === this.addTitle;
    const existingPanel = this.panels.find(matchFn);
    if (existingPanel) {
      existingPanel.currentPanel.panel.reveal(ViewColumn.Active);
      return;
    }

    const title = this.getPanelTitle(existingInstance, true);
    const panel = super.createWebview(context.extensionPath, this.type, title);
    const streamsAuthenticationPanel = new StreamsAuthenticationPanel(
      panel,
      context,
      existingInstance,
      queuedActionId,
      null
    );
    streamsAuthenticationPanel.setCurrentPanel(streamsAuthenticationPanel);
    this.panels.push(streamsAuthenticationPanel);
  }

  /**
   * Get the webview panel title
   * @param existingInstance the existing instance
   * @param isTruncated whether or not to truncate the title
   */
  public static getPanelTitle(
    existingInstance: any,
    isTruncated: boolean
  ): string {
    return existingInstance
      ? `${StreamsAuthenticationPanel.authTitle}: ${
          isTruncated && existingInstance.instanceName.length > 20
            ? `${existingInstance.instanceName.substring(0, 19)}...`
            : existingInstance.instanceName
        }`
      : StreamsAuthenticationPanel.addTitle;
  }

  protected dispose(): void {
    StreamsAuthenticationPanel.panels = StreamsAuthenticationPanel.panels.filter(
      (panel: StreamsAuthenticationPanel) =>
        panel.currentPanel.currentPanelId !== this.currentPanelId
    );
    this.currentPanel = undefined;
    super.dispose();
  }

  protected async setHtml(): Promise<void> {
    // Get password if saved
    let instance = this.existingInstance;
    if (this.existingInstance) {
      const { authentication } = instance;
      if (
        authentication &&
        ((authentication.rememberPassword &&
          authentication.authType === CloudPakForDataAuthType.Password) ||
          (authentication.rememberApiKey &&
            authentication.authType === CloudPakForDataAuthType.ApiKey))
      ) {
        const serviceName = InstanceSelector.selectSystemKeychainServiceName(
          store.getState(),
          this.existingInstance.connectionId
        );
        const username = InstanceSelector.selectUsername(
          store.getState(),
          this.existingInstance.connectionId
        );
        if (serviceName && username) {
          const password = await Registry.getSystemKeychain().getCredentials(
            serviceName,
            username
          );
          instance = _cloneDeep(this.existingInstance);
          const authType = authentication.authType;
          if (instance.authentication.authType) {
            if (authType === CloudPakForDataAuthType.Password) {
              instance.authentication.password = password || '';
            } else {
              instance.authentication.apiKey = password || '';
            }
          } else {
            instance.authentication.password = password || '';
          }
        }
      }
    }

    const params = {
      instanceTypes: STREAMS_ENV,
      cpdVersions: CPD_VERSION,
      instance
    };
    super.setHtml(params);
  }

  protected handleMessage(message: RequestMessage<any>): any {
    switch (message.command) {
      case MessageCommand.ClosePanel:
        return this.handleClosePanelMessage();
      case MessageCommand.TestConnection:
        return this.handleTestConnectionMessage(message);
      case MessageCommand.Authenticate:
        return this.handleAuthenticateMessage(message);
      case MessageCommand.SetSelectedInstance:
        return this.handleSetSelectedInstanceMessage(message);
      case MessageCommand.RemoveInstance:
        return this.handleRemoveInstanceMessage(message);
      case MessageCommand.StartStreamingAnalyticsService:
        return this.startStreamingAnalyticsService(message);
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
   * Handle a test connection message
   * @param message the JSON message sent from the webview
   */
  private handleTestConnectionMessage(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { instanceType } = args;
      let authentication = null;
      let url = null;
      switch (instanceType) {
        case StreamsInstanceType.V5_CPD: {
          const {
            cpdVersion,
            cpdUrl,
            useCpdMasterNodeHost,
            username,
            password,
            apiKey,
            rememberPassword,
            rememberApiKey,
            authType
          } = args;
          authentication = {
            cpdVersion,
            cpdUrl,
            useCpdMasterNodeHost,
            username,
            password,
            apiKey,
            rememberPassword,
            rememberApiKey,
            authType
          };
          url = cpdUrl;
          break;
        }
        case StreamsInstanceType.V5_STANDALONE: {
          const {
            streamsBuildServiceUrl,
            streamsRestServiceUrl,
            streamsSecurityServiceUrl,
            streamsConsoleUrl,
            username,
            password,
            apiKey,
            rememberPassword,
            rememberApiKey
          } = args;
          authentication = {
            streamsBuildServiceUrl,
            streamsRestServiceUrl,
            streamsSecurityServiceUrl,
            streamsConsoleUrl,
            username,
            password,
            apiKey,
            rememberPassword,
            rememberApiKey
          };
          url = streamsRestServiceUrl;
          break;
        }
        case StreamsInstanceType.V4_STREAMING_ANALYTICS: {
          const { credentials } = args;
          authentication = { credentials };
          url = credentials.v2_rest_url;
          break;
        }
        default:
          break;
      }

      if (authentication && url) {
        store
          .dispatch(
            Instance.testStreamsInstanceConnection(instanceType, authentication)
          )
          .then((result) => {
            super.replyMessage(message, {
              result: result === true,
              errorMsg: this.getErrorMessage(result)
            });
          })
          .catch((error) => {
            super.replyMessage(message, {
              result: false,
              errorMsg: this.getErrorMessage(error)
            });
          });
      }
    }
  }

  /**
   * Handle an authenticate message
   * @param message the JSON message sent from the webview
   */
  private handleAuthenticateMessage(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { instanceType, instance: existingInstance, password } = args;
      this.authType =
        password === ''
          ? CloudPakForDataAuthType.Password
          : CloudPakForDataAuthType.ApiKey;
      const successFn = async (result: any): Promise<void> => {
        // Result is a list of Cloud Pak for Data instances
        if (result && result.streamsInstances) {
          super.postMessage({
            command: 'set-v5cpd-connection-form-step',
            args: { step: 2 }
          });
          setTimeout(() => {
            super.postMessage({
              command: 'set-streams-instances',
              args: { result }
            });
          }, 500);
          return;
        }

        this._handleAuthenticationSuccess(result, existingInstance);
      };
      const errorFn = this.getErrorFunction();

      let isDefault = false;
      if (existingInstance) {
        isDefault = existingInstance.isDefault;
      } else {
        // Set as default if this is the first instance
        const storedInstances = Streams.getInstances();
        isDefault = storedInstances.length === 0;
      }

      let authentication: any;
      switch (instanceType) {
        case StreamsInstanceType.V5_CPD: {
          const {
            cpdVersion,
            cpdUrl,
            useCpdMasterNodeHost,
            username,
            password,
            apiKey,
            rememberPassword,
            rememberApiKey,
            authType
          } = args;
          authentication = {
            cpdVersion,
            cpdUrl,
            useCpdMasterNodeHost,
            username,
            password,
            apiKey,
            rememberPassword,
            rememberApiKey,
            authType
          };
          break;
        }
        case StreamsInstanceType.V5_STANDALONE: {
          const {
            streamsBuildServiceUrl,
            streamsRestServiceUrl,
            streamsSecurityServiceUrl,
            streamsConsoleUrl,
            username,
            password,
            apiKey,
            rememberPassword,
            rememberApiKey
          } = args;
          authentication = {
            streamsBuildServiceUrl,
            streamsRestServiceUrl,
            streamsSecurityServiceUrl,
            streamsConsoleUrl,
            username,
            password,
            apiKey,
            rememberPassword,
            rememberApiKey
          };
          break;
        }
        case StreamsInstanceType.V4_STREAMING_ANALYTICS: {
          const { credentials } = args;
          authentication = { credentials };
          break;
        }
        default:
          break;
      }

      if (authentication) {
        const connectionId = existingInstance
          ? existingInstance.connectionId
          : null;
        store
          .dispatch(
            Instance.addStreamsInstance(
              instanceType,
              authentication,
              isDefault,
              connectionId
            )
          )
          .then(successFn)
          .catch(errorFn);
      }
    }
  }

  /**
   * Handle a set selected instance message
   * @param message the JSON message sent from the webview
   */
  private handleSetSelectedInstanceMessage(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const {
        instanceType,
        streamsInstance,
        connectionId,
        instance: existingInstance
      } = args;
      const successFn = async (instance: any): Promise<void> => {
        this._handleAuthenticationSuccess(instance, existingInstance);
      };
      const errorFn = this.getErrorFunction();

      if (instanceType === StreamsInstanceType.V5_CPD) {
        const existingConnectionId = existingInstance
          ? existingInstance.connectionId
          : null;
        store
          .dispatch(
            Instance.setCloudPakForDataStreamsInstance(
              connectionId,
              streamsInstance,
              existingConnectionId
            )
          )
          .then(successFn)
          .catch(errorFn);
      }
    }
  }

  /**
   * Handle a remove instance message
   * @param message the JSON message sent from the webview
   */
  private handleRemoveInstanceMessage(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { connectionId } = args;
      store.dispatch(Instance.removeStreamsInstance(connectionId, true));
    }
  }

  /**
   * Handle a start Streaming Analytics service message
   * @param message the JSON message sent from the webview
   */
  private async startStreamingAnalyticsService(
    message: RequestMessage<any>
  ): Promise<void> {
    const { args } = message;
    if (args) {
      try {
        const { instanceType, connectionId, credentials } = args;
        const instance = InstanceSelector.selectInstance(
          store.getState(),
          connectionId
        );
        const callbackFn = (): void => {
          const successFn = async (result: any): Promise<void> => {
            this._handleAuthenticationSuccess(result, instance);
          };
          const errorFn = this.getErrorFunction();
          const authentication = { credentials };
          store
            .dispatch(
              Instance.addStreamsInstance(
                instanceType,
                authentication,
                instance.isDefault,
                instance.connectionId
              )
            )
            .then(successFn)
            .catch(errorFn);
        };
        await store.dispatch(
          Instance.startStreamingAnalyticsService(
            instance.connectionId,
            callbackFn
          )
        );
      } catch (error) {
        const errorMsg =
          'An error occurred while starting the Streaming Analytics service.';
        super.replyMessage(message, {
          errorMsg: `${errorMsg} ${this.getErrorMessage(error)}`
        });
        Registry.getDefaultMessageHandler().logError(errorMsg, {
          detail: error.response || error.message || error,
          stack: error.response || error.stack
        });
      }
    }
  }

  /**
   * Convert an error object to an error message
   * @param error the error object
   */
  private getErrorMessage(error: any): string {
    const defaultMessage = 'An error occurred.';
    let errorMessage = defaultMessage;
    const { message, response } = error;
    if (message) {
      errorMessage = message;
    }
    if (response) {
      errorMessage = Streams.getErrorMessage(error.response);
      if (response.status) {
        errorMessage = `Request failed with status code ${response.status}. ${errorMessage}`;
      }
    }
    if (!errorMessage) {
      errorMessage = defaultMessage;
    }
    return errorMessage;
  }

  /**
   * Handle authentication success
   * @param newInstance the new Streams instance
   * @param existingInstance the existing Streams instance
   */
  private async _handleAuthenticationSuccess(
    newInstance: any,
    existingInstance: any
  ): Promise<void> {
    if (newInstance) {
      const connectionId = existingInstance
        ? existingInstance.connectionId
        : newInstance.connectionId;
      getStreamsExplorer().getInstancesView().addInstance(newInstance);

      getStreamsExplorer()
        .getInstancesView()
        .watchStreamsInstance(connectionId);
      if (this.queuedActionId) {
        store.dispatch(Editor.runQueuedAction(this.queuedActionId));
      }

      const callbackFn = async (): Promise<void> => {
        await ToolkitUtils.refreshToolkits(connectionId);
        getStreamsExplorer().refreshToolkitsView();
      };
      waitForLanguageClientReady(callbackFn);
    }
    super.close(this.currentPanel);
  }

  /**
   * Get authentication error function
   */
  private getErrorFunction() {
    return (error: any): PromiseLike<void> => {
      const errorMessage = this.getErrorMessage(error);
      super.postMessage({
        command: 'set-auth-error',
        args: {
          authError: {
            message: errorMessage,
            ...(error.name &&
              error.name === 'StreamsError' && { data: error.data })
          }
        }
      });
      Registry.getDefaultMessageHandler().logError(
        'An error occurred during Streams authentication.',
        {
          detail: error.response || error.message || error,
          stack: error.response || error.stack
        }
      );
      return null;
    };
  }
}
