import { getStreamsInstance, InstanceSelector, store } from '@ibmstreams/common';
import * as fs from 'fs';
import _has from 'lodash/has';
import * as os from 'os';
import * as path from 'path';
import {
    commands, ExtensionContext, Uri, ViewColumn, WebviewPanel, window
} from 'vscode';
import { getNonce } from '..';
import BaseWebviewPanel from '../base';
import { BuiltInCommands, Logger } from '../../utils';

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

interface ISubmitJobProperties {
    name: string;
    details: any;
    submissionTimeParameters: any[];
    submitCallbackFn: Function;
    targetInstance: any;
}

interface SubmitJobOptions {
    jobConfig: any;
}

interface ISaveFileOptions {
    fileName: string;
    fileContent: any;
    fileType: any;
    buttonLabel: string;
}

interface ShowNotificationOptions {
    type: string;
    message: string;
}

/**
 * Manages the webview panel for configuring a job submission
 */
export default class ConfigureJobSubmissionWebviewPanel extends BaseWebviewPanel {
    public static panels = [];
    public static id = 0;
    public static panelsReady = {};
    private static readonly _location = ViewColumn.Active;
    private static readonly _titlePrefix = 'Submit Job';
    private static readonly _viewType = 'configureJobSubmission';
    private _currentPanel: ConfigureJobSubmissionWebviewPanel | undefined;
    private _id: number;
    private _properties: any;

    /**
     * @param panel      The webview panel
     * @param context    The extension context
     * @param opts       The configure job options
     */
    private constructor(
        panel: WebviewPanel,
        context: ExtensionContext,
        properties: ISubmitJobProperties
    ) {
        super(panel, context);

        this._id = ++ConfigureJobSubmissionWebviewPanel.id;
        this._properties = properties;

        ConfigureJobSubmissionWebviewPanel.panelsReady[this._id] = false;

        this.setHtml();
        this.receiveMessage();
    }

    /**
     * Create or show the webview
     * @param context    The extension context
     * @param opts       The configure job options
     */
    public static createOrShow(context: ExtensionContext, properties: ISubmitJobProperties): void {
        const title = properties && properties.name
            ? `${this._titlePrefix}: ${properties.name.length > 30 ? `${properties.name.substring(0, 29)}...` : properties.name}`
            : this._titlePrefix;
        const panel = super.createWebview(context, this._location, title, this._viewType, { retainContextWhenHidden: true });
        const configureJobSubmissionPanel = new ConfigureJobSubmissionWebviewPanel(panel, context, properties);
        configureJobSubmissionPanel.setCurrentPanel(configureJobSubmissionPanel);
        this.panels.push(configureJobSubmissionPanel);
    }

    /**
     * Set the current configure job submission panel
     * @param panel    The current panel
     */
    private setCurrentPanel(panel: ConfigureJobSubmissionWebviewPanel): void {
        this._currentPanel = panel;
    }

    /**
     * Close the webview panel if it exists
     */
    private close(): void {
        if (this._currentPanel) {
            this._currentPanel.panel.dispose();
        }
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

    protected dispose(): void {
        ConfigureJobSubmissionWebviewPanel.panels = ConfigureJobSubmissionWebviewPanel.panels.filter((panel: ConfigureJobSubmissionWebviewPanel) => panel._currentPanel._id !== this._id);
        this._currentPanel = undefined;
    }

    protected setHtml(): void {
        let content = fs.readFileSync(path.join(this.extensionPath, 'dist', 'webviews', 'configureJobSubmission.html'), 'utf8');
        const nonce = getNonce();
        content = content.replace(/{{nonce}}/g, nonce);

        const mainScriptPathOnDisk = Uri.file(path.join(this.context.extensionPath, 'dist', 'webviews', 'configureJobSubmission.js'));
        const mainScriptUri = this.panel.webview.asWebviewUri(mainScriptPathOnDisk).toString();
        content = content
            .replace(/{{webviewCspSource}}/g, this.panel.webview.cspSource)
            .replace('{{mainScriptUri}}', mainScriptUri);

        const jcoFiles = this.getJobConfigOverlayFiles();

        // Set parameters to pass as props for submit job container
        const params = {
            jcoFiles,
            ...this._properties
        };
        content = content.replace('{{init}}', `const submitJobParams = ${JSON.stringify(params)};`);

        this.panel.webview.html = content;

        // Check if the webview is ready within three seconds
        setTimeout(() => {
            const isReady = ConfigureJobSubmissionWebviewPanel.panelsReady[this._id];
            if (!isReady) {
                // Dispose the panel
                this._currentPanel.panel.dispose();
                // Re-create the webview
                ConfigureJobSubmissionWebviewPanel.createOrShow(this._context, this._properties);
            }
        }, 5000);
    }

    protected receiveMessage(): void {
        this.panel.webview.onDidReceiveMessage((message: IRequestMessage<any>) => {
            switch (message.command) {
                case 'webview-ready':
                    ConfigureJobSubmissionWebviewPanel.panelsReady[this._id] = true;
                    return null;
                case 'get-job-groups':
                    return this.handleGetJobGroups(message);
                case 'submit-job':
                    return this.handleSubmitJobMessage(message);
                case 'close-panel':
                    return this.handleClosePanelMessage(message);
                case 'save-file':
                    return this._handleSaveFileMessage(message);
                case 'show-notification':
                    return this._handleShowNotificationMessage(message);
                default:
                    break;
            }
            return null;
        }, null, this.disposables);
    }

    /**
     * Get the job configuration overlay files that are located in the same directory as the bundle
     */
    private getJobConfigOverlayFiles(): string[] {
        const { details } = this._properties;
        const prop = 'Bundle path';
        const jcoFiles = [];
        if (details && _has(details, prop)) {
            const bundlePath = details[prop];
            const dirPath = path.dirname(bundlePath);
            fs.readdirSync(dirPath)
                .filter((fileName: any) => typeof fileName === 'string' && path.extname(fileName) === '.json')
                .map((jsonFileName: string) => path.join(dirPath, jsonFileName))
                .forEach((jsonFilePath: string) => {
                    try {
                        const json = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
                        if (_has(json, 'jobConfigOverlays')) {
                            jcoFiles.push({
                                filePath: jsonFilePath,
                                fileContent: json
                            });
                        }
                    } catch (err) {
                        // Do nothing
                    }
                });
        }
        return jcoFiles;
    }

    /**
     * Handle a get job groups message
     * @param message    The JSON message sent from the webview
     */
    private async handleGetJobGroups(message: IRequestMessage<any>): Promise<void> {
        const { connectionId } = this._properties.targetInstance;
        await store.dispatch(getStreamsInstance(connectionId, false, false));
        const { streamsJobGroups } = InstanceSelector.selectStreamsInstanceInfo(store.getState(), connectionId);
        this._replyMessage(message, streamsJobGroups);
    }

    /**
     * Handle a submit job message
     * @param message    The JSON message sent from the webview
     */
    private handleSubmitJobMessage(message: IRequestMessage<any>): void {
        const { args }: { args: SubmitJobOptions } = message;
        if (args) {
            const { jobConfig } = args;
            this._properties.submitCallbackFn(jobConfig);
        }
    }

    /**
     * Handle a close panel message
     * @param message    The JSON message sent from the webview
     */
    private handleClosePanelMessage(message: IRequestMessage<any>): void {
        this.close();
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
     * Handle a show notification message
     * @param message    The JSON message sent from the webview
     */
    private _handleShowNotificationMessage(message: IRequestMessage<any>): void {
        const { args }: { args: ShowNotificationOptions } = message;
        if (args) {
            const { type, message: notificationMessage } = args;
            Logger[type](null, notificationMessage, true);
        }
    }
}
