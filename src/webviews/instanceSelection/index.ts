import { SourceArchiveUtils } from '@ibmstreams/common';
import * as fs from 'fs';
import _map from 'lodash/map';
import * as path from 'path';
import {
    ExtensionContext, Uri, ViewColumn, WebviewPanel, workspace, WorkspaceFolder
} from 'vscode';
import { getNonce } from '..';
import StreamsBuild from '../../build';
import { Streams } from '../../streams';
import BaseWebviewPanel from '../base';

interface IRequestMessage<T> {
    req: string;
    command: string;
    args: T;
}

/**
 * Manages the webview panel for Streams selection
 */
export default class InstanceSelectionWebviewPanel extends BaseWebviewPanel {
    public static panels = [];
    public static id = 0;
    private static readonly _location = ViewColumn.Active;
    private static readonly _viewType = 'instanceSelection';
    private _currentPanel: InstanceSelectionWebviewPanel | undefined;
    private _id: number;
    private _title: string;

    /**
     * @param panel               The webview panel
     * @param context             The extension context
     * @param _action             The build and/or submit action
     * @param _filePaths          The selected file paths
     * @param _postBuildAction    The post-build-action
     */
    private constructor(
        panel: WebviewPanel,
        context: ExtensionContext,
        private _action: string,
        private _filePaths: string[],
        private _postBuildAction: any
    ) {
        super(panel, context);

        this._id = ++InstanceSelectionWebviewPanel.id;
        this._title = panel.title;

        this.setHtml();
        this.receiveMessage();
    }

    /**
     * Create or show the webview
     * @param context            The extension context
     * @param action             The build and/or submit action
     * @param filePaths          The selected file paths
     * @param postBuildAction    The post-build action
     */
    public static createOrShow(context: ExtensionContext, action: string, filePaths: string[], postBuildAction: any): void {
        let title = '';
        if (action === 'submit') {
            title = filePaths.length === 1 ? 'Select a Streams instance for the submission' : 'Select a Streams instance for the submissions';
        } else if (action === 'build' || action === 'build-make') {
            title = postBuildAction === 1 ? 'Select a Streams instance for the build and submission' : 'Select a Streams instance for the build';
        }
        const panel = super.createWebview(context, this._location, title, this._viewType, { retainContextWhenHidden: true });
        const instanceSelectionPanel = new InstanceSelectionWebviewPanel(panel, context, action, filePaths, postBuildAction);
        instanceSelectionPanel._setCurrentPanel(instanceSelectionPanel);
        this.panels.push(instanceSelectionPanel);
    }

    protected dispose(): void {
        InstanceSelectionWebviewPanel.panels = InstanceSelectionWebviewPanel.panels.filter((panel: InstanceSelectionWebviewPanel) => panel._currentPanel._id !== this._id);
        this._currentPanel = undefined;
    }

    protected async setHtml(): Promise<void> {
        let content = fs.readFileSync(path.join(this.extensionPath, 'dist', 'webviews', 'instanceSelection.html'), 'utf8');
        const nonce = getNonce();
        content = content.replace(/{{nonce}}/g, nonce);
        content = content.replace(/{{panelTitle}}/, this._title);

        const mainScriptPathOnDisk = Uri.file(path.join(this.context.extensionPath, 'dist', 'webviews', 'instanceSelection.js'));
        const mainScriptUri = this.panel.webview.asWebviewUri(mainScriptPathOnDisk).toString();
        content = content
            .replace(/{{webviewCspSource}}/g, this.panel.webview.cspSource)
            .replace('{{mainScriptUri}}', mainScriptUri);

        const workspaceFolders = _map(workspace.workspaceFolders, (folder: WorkspaceFolder) => folder.uri.fsPath);
        const appRoot = SourceArchiveUtils.getApplicationRoot(workspaceFolders, this._filePaths[0], false);
        const files = this.getFiles();

        const action = this._action;
        const postBuildAction = this._postBuildAction;
        const displayPath = StreamsBuild.getDisplayPath(appRoot, this._filePaths[0]);

        // Set parameters to pass as props for instance selection container
        const selectInstancePanelTitle = `const selectInstancePanelTitle = ${JSON.stringify(this._title)};`;
        const fileParams = { files, action, postBuildAction };
        const filePathsContainerParams = `const filePathsContainerParams = ${JSON.stringify(fileParams)};`;
        const storedInstances = Streams.getInstances();
        const defaultInstance = Streams.checkDefaultInstance();
        const params = {
            storedInstances, action, postBuildAction, displayPath, defaultInstance
        };
        const selectInstanceContainerParams = `const selectInstanceContainerParams = ${JSON.stringify(params)};`;
        content = content.replace('{{init}}', `${selectInstancePanelTitle}${filePathsContainerParams}${selectInstanceContainerParams}`);

        this.panel.webview.html = content;
    }

    protected receiveMessage(): void {
        this.panel.webview.onDidReceiveMessage((message: IRequestMessage<any>) => {
            switch (message.command) {
                case 'close-panel':
                    return this._handleClosePanelMessage(message);
                case 'submit':
                    return this._submitInstance(message);
                case 'build':
                    return this._buildInstance(message);
                case 'build-make':
                    return this._buildMake(message);
                default:
                    break;
            }
            return null;
        }, null, this.disposables);
    }

    private getFiles(): any[] {
        const workspaceFolders = _map(workspace.workspaceFolders, (folder: WorkspaceFolder) => folder.uri.fsPath);
        const filePathStrings = [];
        for (let i = 0; i < this._filePaths.length; i++) {
            const appRoot = SourceArchiveUtils.getApplicationRoot(workspaceFolders, this._filePaths[i], false);
            const displayPath = StreamsBuild.getDisplayPath(appRoot, this._filePaths[i]);
            filePathStrings.push(displayPath);
        }
        return filePathStrings;
    }

    /**
     * Set the current instance Selection panel
     * @param panel    The current panel
     */
    private _setCurrentPanel(panel: InstanceSelectionWebviewPanel): void {
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
     * Submit an instance that is selected
     * @param message    The JSON message sent from the webview
     */
    private _submitInstance(message: IRequestMessage<any>): void {
        const { args } = message;
        if (args) {
            const { inst } = args;
            StreamsBuild.runSubmit(inst, this._filePaths);
            this._close();
        }
    }

    /**
     * Perform a build from a spl file and either download the bundle(s) or submit the application(s)
     * @param message    The JSON message sent from the webview
     */
    private _buildInstance(message: IRequestMessage<any>): void {
        const { args } = message;
        if (args) {
            const { inst } = args;
            StreamsBuild.runBuildApp(inst, this._filePaths, this._postBuildAction);
            this._close();
        }
    }

    /**
    * Perform a build from a Makefile and either download the bundle(s) or submit the application(s)
    * @param message    The JSON message sent from the webview
     */
    private async _buildMake(message: IRequestMessage<any>): Promise<void> {
        const { args } = message;
        if (args) {
            const { inst } = args;
            StreamsBuild.runBuildMake(inst, this._filePaths, this._postBuildAction);
            this._close();
        }
    }

    /**
     * Handle a close panel message
     * @param message    The JSON message sent from the webview
     */
    private _handleClosePanelMessage(message: IRequestMessage<any>): void {
        this._close();
    }
}
