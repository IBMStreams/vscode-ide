import * as fs from 'fs-extra';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace
} from 'vscode';
import { SplUtils } from '../../streams';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

/**
 * Message command identifier
 */
enum MessageCommand {
  ClosePanel = 'close-panel',
  BrowseForApplicationFolder = 'browse-for-application-folder',
  CheckIfApplicationFolderExists = 'check-if-application-folder-exists',
  CheckIfValidNamespace = 'check-if-valid-namespace',
  CheckIfValidMainCompositeName = 'check-if-valid-main-composite-name',
  CreateSplApplication = 'create-spl-application'
}

/**
 * Manages the webview panel for creating a SPL application. A single panel can exist at a time.
 */
export default class CreateSplApplicationPanel extends BaseWebviewPanel {
  public static currentPanel: CreateSplApplicationPanel | undefined;
  private static readonly type = WebviewType.CreateSplApplication;
  private static readonly title = 'Create a SPL application';

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
    if (CreateSplApplicationPanel.currentPanel) {
      CreateSplApplicationPanel.currentPanel.panel.reveal(ViewColumn.Active);
      return;
    }

    // Otherwise, create a new panel
    const panel = super.createWebview(
      context.extensionPath,
      this.type,
      this.title
    );
    CreateSplApplicationPanel.currentPanel = new CreateSplApplicationPanel(
      panel,
      context,
      folderPath,
      resolve
    );
  }

  protected dispose(): void {
    CreateSplApplicationPanel.currentPanel = undefined;
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
      case MessageCommand.BrowseForApplicationFolder:
        return this.browseForApplicationFolder(message);
      case MessageCommand.CheckIfApplicationFolderExists:
        return this.checkIfApplicationFolderExists(message);
      case MessageCommand.CheckIfValidNamespace:
        return this.checkIfValidNamespace(message);
      case MessageCommand.CheckIfValidMainCompositeName:
        return this.checkIfValidMainCompositeName(message);
      case MessageCommand.CreateSplApplication:
        return this.createSplApplication(message);
      default:
        break;
    }
    return null;
  }

  /**
   * Close the webview panel
   */
  private handleClosePanelMessage(): void {
    super.close(CreateSplApplicationPanel.currentPanel);
    this.resolve(null);
  }

  /**
   * Browse for the application folder
   * @param message the JSON message sent from the webview
   */
  private async browseForApplicationFolder(
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
      openLabel: 'Set as application folder',
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
   * Check if the application folder exists
   * @param message the JSON message sent from the webview
   */
  private async checkIfApplicationFolderExists(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { applicationFolderPath } = args;
      const applicationFolderPathExists = await fs.pathExists(
        applicationFolderPath
      );
      return super.replyMessage(message, applicationFolderPathExists);
    }
  }

  /**
   * Check if a namespace is valid
   * @param message the JSON message sent from the webview
   */
  private async checkIfValidNamespace(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { namespace } = args;
      return super.replyMessage(message, SplUtils.isValidNamespace(namespace));
    }
  }

  /**
   * Check if a main composite name is valid
   * @param message the JSON message sent from the webview
   */
  private async checkIfValidMainCompositeName(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { mainCompositeName } = args;
      return super.replyMessage(
        message,
        SplUtils.isValidIdentifier(mainCompositeName)
      );
    }
  }

  /**
   * Create the SPL application
   * @param message the JSON message sent from the webview
   */
  private createSplApplication(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      super.close(CreateSplApplicationPanel.currentPanel);
      this.resolve(args);
    }
  }
}
