import { PrimitiveOperatorType } from '@ibmstreams/common';
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
import { PrimitiveOperatorProperties } from '../../utils';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

/**
 * Message command identifier
 */
enum MessageCommand {
  ClosePanel = 'close-panel',
  BrowseForProjectFolder = 'browse-for-project-folder',
  CheckIfProjectFolderExists = 'check-if-project-folder-exists',
  CheckIfValidNamespace = 'check-if-valid-namespace',
  CheckIfValidName = 'check-if-valid-name',
  CreatePrimitiveOperator = 'create-primitive-operator'
}

/**
 * Manages the webview panel for creating a primitive operator
 */
export default class CreatePrimitiveOperatorPanel extends BaseWebviewPanel {
  public static panels: CreatePrimitiveOperatorPanel[] = [];
  public static panelIdCounter = 0;
  private static readonly type = WebviewType.CreatePrimitiveOperator;

  /**
   * @param panel the webview panel
   * @param context the extension context
   * @param type the primitive operator type
   * @param folderPath the project folder path
   * @param resolve the promise resolve function
   */
  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private operatorType: PrimitiveOperatorType,
    private folderPath: string,
    private resolve: Function
  ) {
    super(panel, context);
    this.currentPanelId = ++CreatePrimitiveOperatorPanel.panelIdCounter;
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
    operatorType: PrimitiveOperatorType,
    folderPath: string,
    resolve: Function
  ): void {
    const title =
      operatorType === PrimitiveOperatorType.Cpp
        ? 'Create a C++ Primitive Operator'
        : 'Create a Java Primitive Operator';

    // Show panel if it already exists
    const matchFn = (panel: CreatePrimitiveOperatorPanel): boolean =>
      panel.panel.title === title;
    const existingPanel = this.panels.find(matchFn);
    if (existingPanel) {
      existingPanel.currentPanel.panel.reveal(ViewColumn.Active);
      return;
    }

    // Otherwise, create a new panel
    const panel = super.createWebview(context.extensionPath, this.type, title);
    const createPrimitiveOperatorPanel = new CreatePrimitiveOperatorPanel(
      panel,
      context,
      operatorType,
      folderPath,
      resolve
    );
    createPrimitiveOperatorPanel.setCurrentPanel(createPrimitiveOperatorPanel);
    this.panels.push(createPrimitiveOperatorPanel);
  }

  protected dispose(): void {
    CreatePrimitiveOperatorPanel.panels = CreatePrimitiveOperatorPanel.panels.filter(
      (panel: CreatePrimitiveOperatorPanel) =>
        panel.currentPanel.currentPanelId !== this.currentPanelId
    );
    this.currentPanel = undefined;
    super.dispose();
  }

  protected setHtml(): void {
    const params = { type: this.operatorType, folderPath: this.folderPath };
    super.setHtml(params);
  }

  protected handleMessage(message: RequestMessage<any>): any {
    switch (message.command) {
      case MessageCommand.ClosePanel:
        return this.handleClosePanelMessage();
      case MessageCommand.BrowseForProjectFolder:
        return this.browseForProjectFolder(message);
      case MessageCommand.CheckIfProjectFolderExists:
        return this.checkIfProjectFolderExists(message);
      case MessageCommand.CheckIfValidNamespace:
        return this.checkIfValidNamespace(message);
      case MessageCommand.CheckIfValidName:
        return this.checkIfValidName(message);
      case MessageCommand.CreatePrimitiveOperator:
        return this.createPrimitiveOperator(message);
      default:
        break;
    }
    return null;
  }

  /**
   * Close the webview panel
   */
  private handleClosePanelMessage(): void {
    super.close(this.currentPanel);
    this.resolve(null);
  }

  /**
   * Browse for a project folder
   * @param message the JSON message sent from the webview
   */
  private browseForProjectFolder(message: RequestMessage<any>): Thenable<any> {
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
      openLabel: 'Set as project folder',
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
   * Check if a project folder exists
   * @param message the JSON message sent from the webview
   */
  private async checkIfProjectFolderExists(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { folderPath } = args;
      const folderExists = await fs.pathExists(folderPath);
      return super.replyMessage(message, folderExists);
    }
  }

  /**
   * Check if an operator namespace is valid
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
   * Check if an operator name is valid
   * @param message the JSON message sent from the webview
   */
  private async checkIfValidName(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { name } = args;
      return super.replyMessage(message, SplUtils.isValidIdentifier(name));
    }
  }

  /**
   * Create the primitive operator
   * @param message the JSON message sent from the webview
   */
  private createPrimitiveOperator(message: RequestMessage<any>): void {
    const { args }: { args: PrimitiveOperatorProperties } = message;
    if (args) {
      super.close(this.currentPanel);
      this.resolve(args);
    }
  }
}
