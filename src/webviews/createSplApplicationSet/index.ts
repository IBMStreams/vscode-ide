import * as fs from 'fs-extra';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace
} from 'vscode';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

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
  private static readonly type = WebviewType.CreateSplApplicationSet;
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
    const panel = super.createWebview(
      context.extensionPath,
      this.type,
      this.title
    );
    CreateSplApplicationSetPanel.currentPanel = new CreateSplApplicationSetPanel(
      panel,
      context,
      folderPath,
      resolve
    );
  }

  protected dispose(): void {
    CreateSplApplicationSetPanel.currentPanel = undefined;
    super.dispose();
  }

  protected setHtml(): void {
    const params = { folderPath: this.folderPath };
    super.setHtml(params);
  }

  protected handleMessage(message: RequestMessage<any>): any {
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
  }

  /**
   * Close the webview panel
   */
  private handleClosePanelMessage(): void {
    super.close(CreateSplApplicationSetPanel.currentPanel);
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
        return super.replyMessage(message, uris[0].fsPath);
      }
      return super.replyMessage(message, null);
    });
  }

  /**
   * Check if location folder exists
   * @param message the JSON message sent from the webview
   */
  private async checkIfLocationFolderExists(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { location } = args;
      const locationExists = await fs.pathExists(location);
      return super.replyMessage(message, locationExists);
    }
  }

  /**
   * Create the SPL application set
   * @param message the JSON message sent from the webview
   */
  private createSplApplicationSet(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      super.close(CreateSplApplicationSetPanel.currentPanel);
      this.resolve(args);
    }
  }
}
