import * as path from 'path';
import {
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewOptions,
  WebviewPanel,
  window
} from 'vscode';

export enum WebviewType {
  CloudPakForDataAppService = 'cloudPakForDataAppService',
  CloudPakForDataJob = 'cloudPakForDataJob',
  ConfigureImageBuild = 'configureImageBuild',
  ConfigureJobSubmission = 'configureJobSubmission',
  CreatePrimitiveOperator = 'createPrimitiveOperator',
  CreateSplApplication = 'createSplApplication',
  CreateSplApplicationSet = 'createSplApplicationSet',
  InstanceSelection = 'instanceSelection',
  JobGraph = 'jobGraph',
  StreamsAuthentication = 'streamsAuthentication'
}

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
 * The base webview panel
 */
export abstract class BaseWebviewPanel {
  public readonly panel: WebviewPanel;
  public currentPanel: BaseWebviewPanel;
  public currentPanelId: number;
  private readonly extensionPath: string;
  private disposables: Disposable[] = [];

  /**
   * @param panel the webview panel
   * @param context the extension context
   */
  constructor(panel: WebviewPanel, context: ExtensionContext) {
    this.panel = panel;
    this.extensionPath = context.extensionPath;

    // Clean up the webview resources when the panel is destroyed
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message: RequestMessage<any>) => this.handleMessage(message),
      null,
      this.disposables
    );
  }

  /**
   * Create the webview panel
   * @param extensionPath the extension path
   * @param type the webview panel type
   * @param title the webview panel title
   * @param options the webview panel options
   */
  protected static createWebview(
    extensionPath: string,
    type: string,
    title: string,
    options: WebviewOptions = {}
  ): WebviewPanel {
    const panel = window.createWebviewPanel(type, title, ViewColumn.Active, {
      enableScripts: true,
      localResourceRoots: [
        Uri.file(path.join(extensionPath, 'dist', 'webviews'))
      ],
      retainContextWhenHidden: true,
      ...options
    });
    panel.iconPath = Uri.file(
      path.join(extensionPath, 'images', 'ibm-streams.svg')
    );
    return panel;
  }

  /**
   * Set the current panel
   * @param panel the current panel
   */
  protected setCurrentPanel(panel: BaseWebviewPanel): void {
    this.currentPanel = panel;
  }

  /**
   * Dispose of the webview panel
   */
  protected dispose(): void {
    // Clean up our resources
    this.panel.dispose();

    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * Close the webview panel
   * @param currentPanel the current panel
   */
  protected close(currentPanel: BaseWebviewPanel | undefined): void {
    if (currentPanel) {
      currentPanel.panel.dispose();
    }
  }

  /**
   * Set the HTML content for the webview
   * @param params the parameters to pass as props for the main container
   */
  protected setHtml(params: any): void {
    // Get parameters
    const paramsStr = `const params = ${JSON.stringify({
      panelTitle: this.panel.title,
      ...params
    })};`;

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
    const nonce = this.getNonce();
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
    this.panel.title = panelTitle;
    this.panel.webview.html = html;
  }

  /**
   * Send a message to the webview
   * @param message the message to send to the webview
   */
  protected postMessage(message: any): void {
    this.panel.webview.postMessage({ res: message });
  }

  /**
   * Send a reply message to the webview
   * @param originalMessage the original JSON message sent from the webview
   * @param message the message to send to the webview
   */
  protected replyMessage(
    originalMessage: RequestMessage<any>,
    message: any
  ): Thenable<boolean> {
    const reply: ReplyMessage = {
      seq: originalMessage.req,
      res: message
    };
    return this.panel.webview.postMessage(reply);
  }

  /**
   * Handle a message from the webview
   */
  protected abstract handleMessage(message: RequestMessage<any>): any;

  /**
   * Generate a nonce to allow which scripts can be run
   */
  private getNonce(): string {
    let text = '';
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
