import * as fs from 'fs-extra';
import * as path from 'path';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace
} from 'vscode';
import { getNonce } from '..';
import BaseWebviewPanel from '../base';

export interface RequestMessage<T> {
    req: string;
    command: string;
    args: T;
}

export interface ReplyMessage {
    seq?: string;
    err?: any;
    res?: any;
}

/**
 * Message command identifier
 */
enum MessageCommand {
    ClosePanel = 'close-panel',
    BrowseForLocationFolder = 'browse-for-location-folder',
    CheckIfLocationFolderExists = 'check-if-location-folder-exists',
    CreateSplApplicationSet = 'create-spl-application-set'
}

/**
 * Manages the webview panel for creating a SPL application set. A single panel can exist at a time.
 */
export default class CreateSplApplicationSetPanel extends BaseWebviewPanel {
    public static currentPanel: CreateSplApplicationSetPanel | undefined;
    private static readonly type = 'createSplApplicationSet';
    private static readonly title = 'Create a SPL application set';

    /**
     * @param panel the webview panel
     * @param context the extension context
     * @param folderPath the project folder path
     * @param resolve the promise resolve function
     */
    private constructor(
        panel: WebviewPanel,
        context: ExtensionContext,
        private folderPath: string,
        private resolve: Function
    ) {
        super(panel, context);
        this.setHtml();
        this.receiveMessage();
    }

    /**
     * Create or show the webview
     * @param context the extension context
     * @param folderPath the project folder path
     * @param resolve the promise resolve function
     */
    public static createOrShow(
        context: ExtensionContext,
        folderPath: string,
        resolve: Function
    ): void {
        // Show the panel if it already exists
        if (CreateSplApplicationSetPanel.currentPanel) {
            CreateSplApplicationSetPanel.currentPanel.panel.reveal(ViewColumn.Active);
            return;
        }

        // Otherwise, create a new panel
        const panel = super.createWebview(context, ViewColumn.Active, this.title, this.type, { retainContextWhenHidden: true });
        CreateSplApplicationSetPanel.currentPanel = new CreateSplApplicationSetPanel(
            panel,
            context,
            folderPath,
            resolve
        );
    }

    protected dispose(): void {
        CreateSplApplicationSetPanel.currentPanel = undefined;
    }

    protected setHtml(): void {
        // Set parameters to pass as props for the main container
        const params = { folderPath: this.folderPath, panelTitle: this.panel.title };
        const paramsStr = `const params = ${JSON.stringify(params)};`;

        // Get main script to run in the webview
        const scriptPathOnDisk = Uri.file(
            path.join(
                this.extensionPath,
                'dist',
                'webviews',
                `${this.panel.viewType}.js`
            )
        );
        const scriptUri = this.panel.webview.asWebviewUri(scriptPathOnDisk);

        const webviewCspSource = this.panel.webview.cspSource;
        const panelTitle = this.panel.title;
        const nonce = getNonce();
        const scriptSrc = `script-src ${webviewCspSource} 'nonce-${nonce}' 'unsafe-eval'`;
        const styleSrc = `style-src ${webviewCspSource} blob: 'unsafe-inline'`;
        const imgSrc = `img-src ${webviewCspSource} data: https:`;
        const fontSrc = `font-src ${webviewCspSource} data: https://unpkg.com https://fonts.gstatic.com`;
        const html = `<!DOCTYPE html>
        <html lang="en">

        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${scriptSrc}; ${styleSrc}; ${imgSrc}; ${fontSrc};">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${panelTitle}</title>
        </head>

        <body>
            <div id="root">
            <div style="height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div style="width: 10.5rem; height: 10.5rem;">
                <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="-75 -75 150 150">
                    <g>
                    <circle fill="none" stroke="#0f62fe" stroke-width="8" stroke-linecap="butt" stroke-dasharray="150.757,25.1262" cx="0" cy="0" r="37.5">
                        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 0 0" to="360 0 0" dur="690ms" repeatCount="indefinite" />
                    </circle>
                    </g>
                </svg>
                </div>
            </div>
            </div>
            <script nonce="${nonce}">${paramsStr}</script>
            <script nonce="${nonce}" src="${scriptUri}"></script
        </body>

        </html>`;
        this.panel.webview.html = html;
    }

    protected receiveMessage(): void {
        this.panel.webview.onDidReceiveMessage((message: RequestMessage<any>) => {
            switch (message.command) {
                case MessageCommand.ClosePanel:
                    return this.handleClosePanelMessage();
                case MessageCommand.BrowseForLocationFolder:
                    return this.browseForLocationFolder(message);
                case MessageCommand.CheckIfLocationFolderExists:
                    return this.checkIfLocationFolderExists(message);
                case MessageCommand.CreateSplApplicationSet:
                    return this.createSplApplicationSet(message);
                default:
                    break;
            }
            return null;
        }, null, this.disposables);
    }

    /**
     * Close the webview panel if it exists
     */
    private close(): void {
        if (CreateSplApplicationSetPanel.currentPanel) {
            CreateSplApplicationSetPanel.currentPanel.panel.dispose();
        }
    }

    /**
     * Send a reply message to the webview
     * @param originalMessage    The original JSON message sent from the webview
     * @param message            The message to send to the webview
     */
    private replyMessage(originalMessage: RequestMessage<any>, message: any): void {
        const reply: ReplyMessage = {
            seq: originalMessage.req,
            res: message
        };
        this.panel.webview.postMessage(reply);
    }

    /**
     * Close the webview panel
     */
    private handleClosePanelMessage(): void {
        this.close();
        this.resolve(null);
    }

    /**
     * Browse for a location folder
     * @param message the JSON message sent from the webview
     */
    private async browseForLocationFolder(
        message: RequestMessage<any>
    ): Promise<any> {
        const { workspaceFolders } = workspace;
        let defaultUri;
        if (this.folderPath) {
            defaultUri = Uri.file(this.folderPath);
        } else {
            defaultUri =
                workspaceFolders && workspaceFolders.length
                ? workspaceFolders[0].uri
                : null;
        }
        const options = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Set as location folder',
            defaultUri
        };
        return window.showOpenDialog(options).then((uris: Uri[]) => {
            if (uris && uris.length) {
                return this.replyMessage(message, uris[0].fsPath);
            }
            return this.replyMessage(message, null);
        });
    }

    /**
     * Check if location folder exists
     * @param message the JSON message sent from the webview
     */
    private async checkIfLocationFolderExists(
        message: RequestMessage<any>
    ): Promise<any> {
        const { args } = message;
        if (args) {
            const { location } = args;
            const locationExists = await fs.pathExists(location);
            return this.replyMessage(message, locationExists);
        }
    }

    /**
     * Create the SPL application set
     * @param message the JSON message sent from the webview
     */
    private createSplApplicationSet(message: RequestMessage<any>): void {
        const { args }: { args } = message;
        if (args) {
            this.close();
            this.resolve(args);
        }
    }
}
