import { addStreamsRequestAuth, store } from '@streams/common';
import axios from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import {
    commands, ExtensionContext, Uri, ViewColumn, WebviewPanel, window
} from 'vscode';
import { getNonce } from '..';
import { StreamsInstance } from '../../streams';
import { BuiltInCommands, Configuration } from '../../utils';
import BaseWebviewPanel from '../base';

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

interface IStreamsProperties {
    instance: any;
    instanceName: string;
    instanceType: string;
    instanceRestUrl: string;
    jobId: string;
    jobName?: string;
}

/**
 * Manages the webview panel for the Streams job graph
 */
export default class JobGraphWebviewPanel extends BaseWebviewPanel {
    public static panels = [];
    public static id = 0;
    private static readonly _location = ViewColumn.Active;
    private static readonly _titlePrefix = 'Job Graph';
    private static readonly _viewType = 'jobGraph';
    private _currentPanel: JobGraphWebviewPanel | undefined;
    private _id: number;
    private _properties: IStreamsProperties;

    /**
     * @param panel         The webview panel
     * @param context       The extension context
     * @param properties    The Streams properties associated with the job
     */
    private constructor(
        panel: WebviewPanel,
        context: ExtensionContext,
        properties: IStreamsProperties
    ) {
        super(panel, context);

        this._id = ++JobGraphWebviewPanel.id;
        this._properties = properties;

        this.setHtml();
        this.receiveMessage();
    }

    /**
     * Create or show the webview
     * @param context    The extension context
     * @param properties    The Streams properties associated with the job
     */
    public static createOrShow(context: ExtensionContext, properties: IStreamsProperties): void {
        // Show panel if it already exists
        const matchFn = (panel: JobGraphWebviewPanel): boolean => panel._properties.instance.connectionId === properties.instance.connectionId
            && panel._properties.instanceName === properties.instanceName
            && panel._properties.jobId === properties.jobId;
        const existingPanel = this.panels.find(matchFn);
        if (existingPanel) {
            existingPanel._currentPanel.panel.reveal(this._location);
            return;
        }

        const title = properties && properties.jobName
            ? `${properties.jobName.length > 30 ? `${properties.jobName.substring(0, 29)}...` : properties.jobName}`
            : this._titlePrefix;
        const panel = super.createWebview(context, this._location, title, this._viewType, { retainContextWhenHidden: true });
        const jobGraphPanel = new JobGraphWebviewPanel(panel, context, properties);
        jobGraphPanel._setCurrentPanel(jobGraphPanel);
        this.panels.push(jobGraphPanel);
    }

    protected dispose(): void {
        JobGraphWebviewPanel.panels = JobGraphWebviewPanel.panels.filter((panel: JobGraphWebviewPanel) => panel._currentPanel._id !== this._id);
        this._currentPanel = undefined;
    }

    protected setHtml(): void {
        let content = fs.readFileSync(path.join(this.extensionPath, 'dist', 'webviews', 'jobGraph.html'), 'utf8');
        const nonce = getNonce();
        content = content.replace(/{{nonce}}/g, nonce);

        const mainScriptPathOnDisk = Uri.file(path.join(this.context.extensionPath, 'dist', 'webviews', 'jobGraph.js'));
        const mainScriptUri = this.panel.webview.asWebviewUri(mainScriptPathOnDisk).toString();
        content = content
            .replace(/{{webviewCspSource}}/g, this.panel.webview.cspSource)
            .replace('{{mainScriptUri}}', mainScriptUri);

        // Set parameters to pass as props for job graph container
        content = content.replace('{{init}}', `const jobGraphContainerParams = ${JSON.stringify(this._properties)};`);

        this.panel.webview.html = content;
    }

    protected receiveMessage(): void {
        this.panel.webview.onDidReceiveMessage((message: IRequestMessage<any>) => {
            switch (message.command) {
                case 'job-selected':
                    return this.handleJobSelectedMessage(message);
                case 'call-streams-rest-api':
                    return this._handleStreamsRestAPIMessage(message);
                case 'save-file':
                    return this._handleSaveFileMessage(message);
                case 'get-dynamic-views':
                    return this._handleGetDynamicViewsMessage(message);
                case 'set-dynamic-views':
                    return this._handleSetDynamicViewsMessage(message);
                default:
                    break;
            }
            return null;
        }, null, this.disposables);
    }

    /**
     * Set the current job graph panel
     * @param panel    The current panel
     */
    private _setCurrentPanel(panel: JobGraphWebviewPanel): void {
        this._currentPanel = panel;
    }

    /**
     * Make a request to the Streams REST API
     * @param endpoint    The endpoint URL
     * @param reserved    Whether or not this is a reserved call (hidden, internal use only)
     * @param options     The request options
     */
    private async _callStreamsRestAPI(endpoint: string, reserved: boolean, options: any = {}): Promise<any> {
        const { instance, instanceRestUrl } = this._properties;

        let config: any = { httpsAgent: new https.Agent({ rejectUnauthorized: false }) };
        config = await addStreamsRequestAuth(store.getState(), instance.connectionId, config);

        // Check if we already have a complete URL
        if (endpoint.startsWith('http')) {
            config.url = endpoint;
        } else {
            config.url = endpoint;
            if (!reserved) {
                config.baseURL = instanceRestUrl;
            } else if (instanceRestUrl.includes('/streams-rest/instances/')) {
                config.baseURL = instanceRestUrl.replace(/\/streams-rest\/instances\//, '/streams-rest/reserved/instances/');
            } else if (instanceRestUrl.includes('/streams/rest/instances/')) {
                config.baseURL = instanceRestUrl.replace(/\/streams\/rest\/instances\//, '/streams/rest/reserved/instances/');
            }
        }

        if (options.headers) {
            config.headers = { ...config.headers, ...options.headers };
            delete options.headers;
        }
        config = { ...config, ...options };
        return axios(config).then((response) => {
            const { data, headers, status } = response;

            // If this is a job deletion and it was successful, refresh the instances in the Streams Explorer view
            if (options.method && options.method.toLowerCase() === 'delete' && endpoint.startsWith('jobs/') && status === 204) {
                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
            }

            return { error: null, data, headers, status };
        }).catch((error) => {
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
            return { error: serializedError, data: null, headers: null, status: null };
        });
    }

    /**
     * Send a reply message to the webview
     * @param originalMessage    The original JSON message sent from the webview
     * @param message            The JSON message to send to the webview
     */
    private _replyMessage(originalMessage: IRequestMessage<any>, message: any): void {
        const reply: IReplyMessage = {
            seq: originalMessage.req,
            res: message
        };
        this.panel.webview.postMessage(reply);
    }

    /**
     * Handle a job selected message
     * @param message    The JSON message sent from the webview
     */
    private handleJobSelectedMessage(message: IRequestMessage<any>): void {
        const { args }: { args: { jobId: string, jobName: string } } = message;
        if (args) {
            const { jobId, jobName } = args;
            this._properties.jobId = jobId;
            // Change the webview panel title to the name of the selected job
            this._currentPanel.panel.title = `${jobName.length > 30 ? `${jobName.substring(0, 29)}...` : jobName}`;
        }
    }

    /**
     * Handle a Streams REST API message
     * @param message    The JSON message sent from the webview
     */
    private async _handleStreamsRestAPIMessage(message: IRequestMessage<any>): Promise<any> {
        const { args }: { args: IStreamsRestAPIRequestOptions<any> } = message;
        if (args) {
            const { endpoint, reserved = false, options = {} } = args;
            const response = await this._callStreamsRestAPI(endpoint, reserved, options);
            this._replyMessage(message, response);
        }
    }

    /**
     * Handle a save data message
     * @param message    The JSON message sent from the webview
     */
    private async _handleSaveFileMessage(message: IRequestMessage<any>): Promise<any> {
        const { args }: { args: ISaveFileOptions } = message;
        if (args) {
            const { fileName, fileContent, fileType, buttonLabel } = args;
            const options = {
                defaultUri: Uri.file(fileName),
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
     * @param message    The JSON message sent from the webview
     */
    private async _handleGetDynamicViewsMessage(message: IRequestMessage<any>): Promise<any> {
        const { args }: { args: IDynamicViewOptions } = message;
        if (args) {
            const { key } = args;
            let value = Configuration.getState(key);
            // Set default value
            if (!value) {
                await Configuration.setState(key, []);
                value = Configuration.getState(key);
            }
            this._replyMessage(message, value);
        }
    }

    /**
     * Handle a set dynamic views message
     * @param message    The JSON message sent from the webview
     */
    private async _handleSetDynamicViewsMessage(message: IRequestMessage<any>): Promise<any> {
        const { args }: { args: IDynamicViewOptions } = message;
        if (args) {
            const { key, value } = args;
            await Configuration.setState(key, value);
            this._replyMessage(message, null);
        }
    }
}
