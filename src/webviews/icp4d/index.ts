import * as fs from 'fs';
import * as path from 'path';
import { Disposable, ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import ICP4DWebviewPanelUtils from './utils';

export class ICP4DWebviewPanel {
    public static currentPanel: ICP4DWebviewPanel | undefined;

    public static readonly viewType = 'icp4d';

    private readonly _panel: WebviewPanel;
    private readonly _context: ExtensionContext;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    public static createOrShow(context: ExtensionContext) {
        if (ICP4DWebviewPanel.currentPanel) {
            ICP4DWebviewPanel.currentPanel._panel.reveal(ViewColumn.Beside);
            return;
        }

        const panel = window.createWebviewPanel(ICP4DWebviewPanel.viewType, 'IBM Cloud Private for Data Settings', ViewColumn.Beside, {
            enableScripts: true,
            localResourceRoots: [ Uri.file(path.join(context.extensionPath, 'out')) ]
        });
        panel.iconPath = Uri.file(path.join(context.extensionPath, 'images', 'ibm-streaming-analytics.svg'));
        ICP4DWebviewPanel.currentPanel = new ICP4DWebviewPanel(panel, context);
    }

    public static revive(panel: WebviewPanel, context: ExtensionContext) {
        ICP4DWebviewPanel.currentPanel = new ICP4DWebviewPanel(panel, context);
    }

    private constructor(
        panel: WebviewPanel,
        context: ExtensionContext
    ) {
        this._panel = panel;
        this._context = context;
        this._extensionPath = context.extensionPath;

        this._setHtml();

        ICP4DWebviewPanelUtils.receiveMessage(this._panel, this._disposables);
        const unsubscribe = ICP4DWebviewPanelUtils.reduxSubscribe(this._panel, this._setHtml.bind(this));

        this._panel.onDidDispose(
            () => {
                unsubscribe();
                this.dispose();
            },
            null,
            this._disposables
        );

        this._panel.onDidChangeViewState((e) => {
            if (this._panel.visible) {
                this._setHtml();
            }
        }, null, this._disposables);
    }

    public dispose() {
        ICP4DWebviewPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _setHtml() {
        let content = fs.readFileSync(path.join(this._extensionPath, 'src', 'webviews', 'icp4d', 'resources', 'index.html'), 'utf8');

        const nonce = getNonce();
        content = content.replace(/{{nonce}}/g, nonce);

        const vendorScriptPathOnDisk = Uri.file(this._context.asAbsolutePath('out/vendor.js'));
        const vendorSriptUri = vendorScriptPathOnDisk.with({ scheme: 'vscode-resource' }).toString();
        content = content.replace('{{vendorScriptUri}}', vendorSriptUri);

        const mainScriptPathOnDisk = Uri.file(this._context.asAbsolutePath('out/icp4d.js'));
        const mainScriptUri = mainScriptPathOnDisk.with({ scheme: 'vscode-resource' }).toString();
        content = content.replace('{{mainScriptUri}}', mainScriptUri);

        this._panel.webview.html = content;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
