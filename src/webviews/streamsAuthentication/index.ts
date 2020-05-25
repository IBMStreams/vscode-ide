import {
    Editor, Instance, InstanceSelector, Registry, store, StreamsInstanceType, ToolkitUtils
} from '@streams/common';
import * as fs from 'fs';
import * as path from 'path';
import _cloneDeep from 'lodash/cloneDeep';
import { ExtensionContext, Uri, ViewColumn, WebviewPanel } from 'vscode';
import { getNonce } from '..';
import { waitForLanguageClientReady } from '../../languageClient';
import { CPD_VERSION, Streams, STREAMS_ENV } from '../../streams';
import { getStreamsExplorer } from '../../views';
import BaseWebviewPanel from '../base';

interface IRequestMessage<T> {
    req: string;
    command: string;
    args: T;
}

interface IReplyMessage {
    seq?: string;
    err?: any;
    res?: any;
}

/**
 * Manages the webview panel for Streams authentication
 */
export default class StreamsAuthenticationWebviewPanel extends BaseWebviewPanel {
    public static panels = [];
    public static id = 0;
    private static readonly _location = ViewColumn.Active;
    private static readonly _viewType = 'streamsAuthentication';
    private static readonly _addTitle = 'Add IBM Streams instance';
    private static readonly _authTitle = 'Authenticate to IBM Streams instance';
    private _currentPanel: StreamsAuthenticationWebviewPanel | undefined;
    private _id: number;
    private _title: string;

    /**
     * @param panel               The webview panel
     * @param context             The extension context
     * @param existingInstance    The existing instance
     * @param queuedActionId      The queued action identifier
     */
    private constructor(
        panel: WebviewPanel,
        context: ExtensionContext,
        private _existingInstance: any,
        private _queuedActionId: string
    ) {
        super(panel, context);

        this._id = ++StreamsAuthenticationWebviewPanel.id;
        this._title = panel.title;

        this.setHtml();
        this.receiveMessage();
    }

    /**
     * Create or show the webview
     * @param context              The extension context
     * @param env                  The Streams environment
     * @param connectionDetails    The instance connection details
     * @param instanceName         The instance name
     * @param queuedActionId       The queued action identifier
     */
    public static createOrShow(context: ExtensionContext, existingInstance: any, queuedActionId: string): void {
        // Show panel if it already exists
        const matchFn = existingInstance
            ? (panel: StreamsAuthenticationWebviewPanel) => panel._existingInstance && panel._existingInstance.connectionId === existingInstance.connectionId
            : (panel: StreamsAuthenticationWebviewPanel) => panel._title === this._addTitle;
        const existingPanel = this.panels.find(matchFn);
        if (existingPanel) {
            existingPanel._currentPanel.panel.reveal(this._location);
            return;
        }

        const title = this.getPanelTitle(existingInstance, true);
        const panel = super.createWebview(context, this._location, title, this._viewType, { retainContextWhenHidden: true });
        const authenticationPanel = new StreamsAuthenticationWebviewPanel(panel, context, existingInstance, queuedActionId);
        authenticationPanel._setCurrentPanel(authenticationPanel);
        this.panels.push(authenticationPanel);
    }

    /**
     * Get the webview panel title
     * @param existingInstance    The existing instance
     * @param isTruncated         Whether or not to truncate the title
     */
    public static getPanelTitle(existingInstance: any, isTruncated: boolean): string {
        return existingInstance
            ? `${StreamsAuthenticationWebviewPanel._authTitle}: ${isTruncated && existingInstance.instanceName.length > 20 ? `${existingInstance.instanceName.substring(0, 19)}...` : existingInstance.instanceName}`
            : StreamsAuthenticationWebviewPanel._addTitle;
    }

    protected dispose(): void {
        StreamsAuthenticationWebviewPanel.panels = StreamsAuthenticationWebviewPanel.panels.filter((panel: StreamsAuthenticationWebviewPanel) => panel._currentPanel._id !== this._id);
        this._currentPanel = undefined;
    }

    protected async setHtml(): Promise<void> {
        let content = fs.readFileSync(path.join(this.extensionPath, 'dist', 'webviews', 'streamsAuthentication.html'), 'utf8');
        const nonce = getNonce();
        content = content.replace(/{{nonce}}/g, nonce);
        content = content.replace(/{{panelTitle}}/, this._title);

        const mainScriptPathOnDisk = Uri.file(path.join(this.context.extensionPath, 'dist', 'webviews', 'streamsAuthentication.js'));
        const mainScriptUri = this.panel.webview.asWebviewUri(mainScriptPathOnDisk).toString();
        content = content
            .replace(/{{webviewCspSource}}/g, this.panel.webview.cspSource)
            .replace('{{mainScriptUri}}', mainScriptUri);

        // Get password if saved
        let instance = this._existingInstance;
        if (this._existingInstance) {
            const { authentication } = instance;
            if (authentication && authentication.rememberPassword) {
                const serviceName = InstanceSelector.selectSystemKeychainServiceName(store.getState(), this._existingInstance.connectionId);
                const username = InstanceSelector.selectUsername(store.getState(), this._existingInstance.connectionId);
                if (serviceName && username) {
                    const password = await Registry.getSystemKeychain().getCredentials(serviceName, username);
                    instance = _cloneDeep(this._existingInstance);
                    instance.authentication.password = password || '';
                }
            }
        }

        // Set parameters to pass as props for authentication container
        const title = StreamsAuthenticationWebviewPanel.getPanelTitle(this._existingInstance, false);
        const streamsAuthPanelTitle = `const streamsAuthPanelTitle = ${JSON.stringify(title)};`;
        const params = {
            instanceTypes: STREAMS_ENV,
            cpdVersions: CPD_VERSION,
            instance
        };
        const streamsAuthContainerParams = `const streamsAuthContainerParams = ${JSON.stringify(params)};`;
        content = content.replace('{{init}}', `${streamsAuthPanelTitle}${streamsAuthContainerParams}`);

        this.panel.webview.html = content;
    }

    protected receiveMessage(): void {
        this.panel.webview.onDidReceiveMessage((message: IRequestMessage<any>) => {
            switch (message.command) {
                case 'test-connection':
                    return this._handleTestConnectionMessage(message);
                case 'authenticate':
                    return this._handleAuthenticateMessage(message);
                case 'set-selected-instance':
                    return this._handleSetSelectedInstanceMessage(message);
                case 'remove-instance':
                    return this._handleRemoveInstanceMessage(message);
                case 'close-panel':
                    return this._handleClosePanelMessage(message);
                default:
                    break;
            }
            return null;
        }, null, this.disposables);
    }

    /**
     * Set the current authentication panel
     * @param panel    The current panel
     */
    private _setCurrentPanel(panel: StreamsAuthenticationWebviewPanel): void {
        this._currentPanel = panel;
    }

    /**
     * Close the webview panel if it exists
     */
    private _close(): void {
        if (this._currentPanel) {
            this._currentPanel.panel.dispose();
        }
    }

    /**
     * Send a message to the webview
     * @param message    The message to send to the webview
     */
    private _postMessage(message: any): void {
        this.panel.webview.postMessage({ res: message });
    }

    /**
     * Send a reply message to the webview
     * @param originalMessage    The original JSON message sent from the webview
     * @param message            The message to send to the webview
     */
    private _replyMessage(originalMessage: IRequestMessage<any>, message: any): void {
        const reply: IReplyMessage = {
            seq: originalMessage.req,
            res: message
        };
        this.panel.webview.postMessage(reply);
    }

    /**
     * Handle a test connection message
     * @param message    The JSON message sent from the webview
     */
    private _handleTestConnectionMessage(message: IRequestMessage<any>): void {
        const { args } = message;
        if (args) {
            const { instanceType } = args;
            let authentication = null;
            let url = null;
            switch (instanceType) {
                case StreamsInstanceType.V5_CPD: {
                    const {
                        cpdVersion, cpdUrl, useCpdMasterNodeHost, username, password, rememberPassword
                    } = args;
                    authentication = {
                        cpdVersion, cpdUrl, useCpdMasterNodeHost, username, password, rememberPassword
                    };
                    url = cpdUrl;
                    break;
                }
                case StreamsInstanceType.V5_STANDALONE: {
                    const {
                        streamsBuildServiceUrl, streamsRestServiceUrl, streamsConsoleUrl, username, password, rememberPassword
                    } = args;
                    authentication = {
                        streamsBuildServiceUrl, streamsRestServiceUrl, streamsConsoleUrl, username, password, rememberPassword
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
                store.dispatch(Instance.testStreamsInstanceConnection(instanceType, authentication))
                    .then((result) => {
                        this._replyMessage(message, {
                            result: result === true,
                            errorMsg: this._getErrorMessage(result)
                        });
                    })
                    .catch((error) => {
                        this._replyMessage(message, {
                            result: false,
                            errorMsg: this._getErrorMessage(error)
                        });
                    });
            }
        }
    }

    /**
     * Handle an authenticate message
     * @param message    The JSON message sent from the webview
     */
    private _handleAuthenticateMessage(message: IRequestMessage<any>): void {
        const { args } = message;
        if (args) {
            const { instanceType, instance: existingInstance } = args;
            const successFn = async (result: any): Promise<void> => {
                // Result is a list of Cloud Pak for Data instances
                if (result && result.streamsInstances) {
                    this._postMessage({
                        command: 'set-v5cpd-connection-form-step',
                        args: { step: 2 }
                    });
                    setTimeout(() => {
                        this._postMessage({
                            command: 'set-streams-instances',
                            args: { result }
                        });
                    }, 500);
                    return;
                }

                this._handleAuthenticationSuccess(result, existingInstance);
            };
            const errorFn = this._getErrorFunction();

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
                        cpdVersion, cpdUrl, useCpdMasterNodeHost, username, password, rememberPassword
                    } = args;
                    authentication = {
                        cpdVersion, cpdUrl, useCpdMasterNodeHost, username, password, rememberPassword
                    };
                    break;
                }
                case StreamsInstanceType.V5_STANDALONE: {
                    const {
                        streamsBuildServiceUrl, streamsRestServiceUrl, streamsConsoleUrl, username, password, rememberPassword
                    } = args;
                    authentication = {
                        streamsBuildServiceUrl, streamsRestServiceUrl, streamsConsoleUrl, username, password, rememberPassword
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
                const connectionId = existingInstance ? existingInstance.connectionId : null;
                store.dispatch(Instance.addStreamsInstance(instanceType, authentication, isDefault, connectionId))
                    .then(successFn)
                    .catch(errorFn);
            }
        }
    }

    /**
     * Handle a set selected instance message
     * @param message    The JSON message sent from the webview
     */
    private _handleSetSelectedInstanceMessage(message: IRequestMessage<any>): void {
        const { args } = message;
        if (args) {
            const { instanceType, streamsInstance, connectionId, instance: existingInstance } = args;
            const successFn = async (instance: any): Promise<void> => {
                this._handleAuthenticationSuccess(instance, existingInstance);
            };
            const errorFn = this._getErrorFunction();

            if (instanceType === StreamsInstanceType.V5_CPD) {
                const existingConnectionId = existingInstance ? existingInstance.connectionId : null;
                store.dispatch(Instance.setCloudPakForDataStreamsInstance(connectionId, streamsInstance, existingConnectionId))
                    .then(successFn)
                    .catch(errorFn);
            }
        }
    }

    /**
     * Handle a remove instance message
     * @param message    The JSON message sent from the webview
     */
    private _handleRemoveInstanceMessage(message: IRequestMessage<any>): void {
        const { args } = message;
        if (args) {
            const { connectionId } = args;
            store.dispatch((Instance.removeStreamsInstance(connectionId, true)));
        }
    }

    /**
     * Handle a close panel message
     * @param message    The JSON message sent from the webview
     */
    private _handleClosePanelMessage(message: IRequestMessage<any>): void {
        this._close();
    }

    /**
     * Convert an error object to an error message
     * @param error    The error object
     */
    private _getErrorMessage(error: any): string {
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
     * @param newInstance         The new Streams instance
     * @param existingInstance    The existing Streams instance
     */
    private async _handleAuthenticationSuccess(newInstance: any, existingInstance: any): Promise<void> {
        if (newInstance) {
            const connectionId = existingInstance ? existingInstance.connectionId : newInstance.connectionId;
            getStreamsExplorer().getInstancesView().addInstance(newInstance);

            getStreamsExplorer().getInstancesView().watchStreamsInstance(connectionId);
            if (this._queuedActionId) {
                store.dispatch(Editor.runQueuedAction(this._queuedActionId));
            }

            const callbackFn = async (): Promise<void> => {
                await ToolkitUtils.refreshToolkits(connectionId);
                getStreamsExplorer().refreshToolkitsView();
            }
            waitForLanguageClientReady(callbackFn);
        }
        this._close();
    }

    /**
     * Get authentication error function
     */
    private _getErrorFunction() {
        return (error: any): PromiseLike<void> => {
            const errorMessage = this._getErrorMessage(error);
            this._postMessage({
                command: 'set-auth-error',
                args: { authError: { message: errorMessage } }
            });
            Registry.getDefaultMessageHandler().handleError(
                'An error occurred during Streams authentication.',
                {
                    showNotification: false,
                    detail: error.response || error.message || error,
                    stack: error.response || error.stack
                }
            );
            return null;
        };
    }
}
