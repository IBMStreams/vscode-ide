import * as path from 'path';
import {
    Disposable, ExtensionContext, Uri, ViewColumn, WebviewPanel, window
} from 'vscode';

/**
 * The base webview panel
 */
export default abstract class BaseWebviewPanel {
    private readonly _panel: WebviewPanel;
    private readonly _extensionPath: string;
    protected readonly _context: ExtensionContext;
    private _disposables: Disposable[] = [];

    /**
     * @param panel      The webview panel
     * @param context    The extension context
     */
    constructor(panel: WebviewPanel, context: ExtensionContext) {
        this._panel = panel;
        this._context = context;
        this._extensionPath = context.extensionPath;

        // Clean up the webview resources when the panel is destroyed
        this._panel.onDidDispose(
            () => {
                this.dispose();
                this._panel.dispose();
                while (this._disposables.length) {
                    const x = this._disposables.pop();
                    if (x) {
                        x.dispose();
                    }
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Create the webview
     * @param context         The extension context
     * @param currentPanel    The current webview panel
     * @param location        The panel location
     * @param title           The panel title
     * @param viewType        The view type
     * @param options         The show options
     */
    protected static createWebview(
        context: ExtensionContext,
        location: ViewColumn,
        title: string,
        viewType: string,
        options: any = {}
    ): WebviewPanel {
        const panel = window.createWebviewPanel(viewType, title, location, {
            enableScripts: true,
            localResourceRoots: [Uri.file(path.join(context.extensionPath, 'dist', 'webviews'))],
            ...options
        });
        panel.iconPath = Uri.file(path.join(context.extensionPath, 'images', 'ibm-streams.svg'));
        return panel;
    }

    /**
     * Dispose of the webview panel
     */
    protected abstract dispose(): void;

    /**
     * Set the HTML content for the webview
     */
    protected abstract setHtml(): void;

    /**
     * Receive a message from the webview
     */
    protected abstract receiveMessage(): void;

    /**
     * Get the webview panel
     */
    public get panel(): WebviewPanel {
        return this._panel;
    }

    /**
     * Get the extension context
     */
    public get context(): ExtensionContext {
        return this._context;
    }

    /**
     * Get the extension path
     */
    public get extensionPath(): string {
        return this._extensionPath;
    }

    /**
     * Get the disposable objects
     */
    public get disposables(): Disposable[] {
        return this._disposables;
    }
}
