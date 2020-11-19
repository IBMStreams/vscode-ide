import { PostBuildAction, SourceArchiveUtils } from '@ibmstreams/common';
import _map from 'lodash/map';
import {
  ExtensionContext,
  WebviewPanel,
  workspace,
  WorkspaceFolder
} from 'vscode';
import StreamsBuild from '../../build';
import { Streams } from '../../streams';
import { ActionType } from '../../utils';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

/**
 * Message command identifier
 */
enum MessageCommand {
  ClosePanel = 'close-panel',
  Build = 'build',
  BuildMake = 'build-make',
  Submit = 'submit',
  UploadBundleCpd = 'upload-bundle-cpd',
  BuildImage = 'build-image',
  BuildToolkit = 'build-toolkit',
  BuildPrimitiveOperator = 'build-primitive-operator',
  MakeCppPrimitiveOperator = 'make-c++-primitive-operator'
}

/**
 * Manages the webview panel for Streams selection
 */
export default class InstanceSelectionPanel extends BaseWebviewPanel {
  public static panels: InstanceSelectionPanel[] = [];
  public static panelIdCounter = 0;
  private static readonly type = WebviewType.InstanceSelection;

  /**
   * @param panel the webview panel
   * @param context the extension context
   * @param action the build and/or submit action
   * @param filePaths the selected file paths
   * @param postBuildAction the post-build-action
   * @param args the post-selection args
   */
  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private action: string,
    private filePaths: string[],
    private postBuildAction: any,
    private args: any
  ) {
    super(panel, context);
    this.currentPanelId = ++InstanceSelectionPanel.panelIdCounter;
    this.setHtml();
  }

  /**
   * Create or show the webview
   * @param context the extension context
   * @param action the build and/or submit action
   * @param filePaths the selected file paths
   * @param postBuildAction the post-build action
   * @param args the post-selection args
   */
  public static createOrShow(
    context: ExtensionContext,
    action: string,
    filePaths: string[],
    postBuildAction: any,
    args?: any
  ): void {
    let title = '';
    if (action === ActionType.BuildApp || action === ActionType.BuildMake) {
      title =
        postBuildAction === 1
          ? 'Select a Streams instance for the build and submission'
          : 'Select a Streams instance for the build';
    } else if (action === ActionType.Submit) {
      title =
        filePaths.length === 1
          ? 'Select a Streams instance for the submission'
          : 'Select a Streams instance for the submissions';
    } else if (action === ActionType.UploadBundleCpd) {
      title = 'Select a Streams instance for the application bundle upload';
    } else if (action === ActionType.BuildImage) {
      title =
        filePaths.length === 1
          ? 'Select a Streams instance for the edge application image build'
          : 'Select a Streams instance for the edge application image builds';
    } else if (action === ActionType.BuildToolkit) {
      title = 'Select a Streams instance for the toolkit build';
    } else if (action === ActionType.BuildPrimitiveOperator) {
      const { operatorType } = args;
      title = `Select a Streams instance for the ${operatorType} primitive operator build`;
    } else if (action === ActionType.MakeCppPrimitiveOperator) {
      title =
        'Select a Streams instance for the C++ primitive operator creation';
    }

    // Create a new panel
    const panel = super.createWebview(context.extensionPath, this.type, title);
    const instanceSelectionPanel = new InstanceSelectionPanel(
      panel,
      context,
      action,
      filePaths,
      postBuildAction,
      args
    );
    instanceSelectionPanel.setCurrentPanel(instanceSelectionPanel);
    this.panels.push(instanceSelectionPanel);
  }

  protected dispose(): void {
    InstanceSelectionPanel.panels = InstanceSelectionPanel.panels.filter(
      (panel: InstanceSelectionPanel) =>
        panel.currentPanel.currentPanelId !== this.currentPanelId
    );
    this.currentPanel = undefined;
    super.dispose();
  }

  protected setHtml(): void {
    const isPerformingImageBuild =
      this.action === ActionType.BuildImage ||
      this.postBuildAction === PostBuildAction.BuildImage;
    let displayPath = '';
    let files = [];
    if (isPerformingImageBuild) {
      displayPath = StreamsBuild.getDisplayPath(
        null,
        null,
        this.filePaths[0],
        null
      );
      files.push(displayPath);
    } else if (
      this.action === ActionType.BuildToolkit ||
      this.action === ActionType.BuildPrimitiveOperator ||
      this.action === ActionType.MakeCppPrimitiveOperator
    ) {
      displayPath = StreamsBuild.getDisplayPath(
        null,
        null,
        null,
        this.filePaths[0]
      );
      files.push(displayPath);
    } else {
      const workspaceFolders = workspace.workspaceFolders
        ? _map(
            workspace.workspaceFolders,
            (folder: WorkspaceFolder) => folder.uri.fsPath
          )
        : [];
      const appRoot = SourceArchiveUtils.getApplicationRoot(
        workspaceFolders,
        this.filePaths[0],
        false
      );
      displayPath = StreamsBuild.getDisplayPath(
        appRoot,
        this.filePaths[0],
        null,
        null
      );
      files = this.getFiles();
    }

    let storedInstances = [];
    if (isPerformingImageBuild) {
      storedInstances = Streams.getInstancesWithImageBuildEnabled();
    } else if (
      this.action === ActionType.BuildToolkit ||
      this.action === ActionType.BuildPrimitiveOperator ||
      this.action === ActionType.MakeCppPrimitiveOperator
    ) {
      storedInstances = Streams.getInstancesWithToolkitBuildSupport();
    } else if (this.action === ActionType.UploadBundleCpd) {
      storedInstances = Streams.getInstancesWithCpdSpacesSupport();
    } else {
      storedInstances = Streams.getInstances();
    }
    let defaultInstance = Streams.checkDefaultInstance();
    if (
      isPerformingImageBuild ||
      this.action === ActionType.BuildToolkit ||
      this.action === ActionType.BuildPrimitiveOperator ||
      this.action === ActionType.MakeCppPrimitiveOperator ||
      this.action === ActionType.UploadBundleCpd
    ) {
      if (defaultInstance) {
        const matchingDefaultInstance = storedInstances.find(
          (instance) => instance.connectionId === defaultInstance.connectionId
        );
        if (!matchingDefaultInstance) {
          [defaultInstance] = storedInstances;
        }
      } else {
        [defaultInstance] = storedInstances;
      }
    }

    const params = {
      storedInstances,
      action: this.action,
      postBuildAction: this.postBuildAction,
      files,
      displayPath,
      defaultInstance
    };
    super.setHtml(params);
  }

  protected handleMessage(message: RequestMessage<any>): any {
    switch (message.command) {
      case MessageCommand.ClosePanel:
        return this.handleClosePanelMessage();
      case MessageCommand.Build:
        return this.build(message);
      case MessageCommand.BuildMake:
        return this.buildMake(message);
      case MessageCommand.Submit:
        return this.submit(message);
      case MessageCommand.UploadBundleCpd:
        return this.uploadBundleCpd(message);
      case MessageCommand.BuildImage:
        return this.buildImage(message);
      case MessageCommand.BuildToolkit:
        return this.buildToolkit(message);
      case MessageCommand.BuildPrimitiveOperator:
        return this.buildPrimitiveOperator(message);
      case MessageCommand.MakeCppPrimitiveOperator:
        return this.makeCppPrimitiveOperator(message);
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
  }

  /**
   * Build from SPL file
   * @param message the JSON message sent from the webview
   */
  private build(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { inst } = args;
      StreamsBuild.runBuildApp(inst, this.filePaths, this.postBuildAction);
      super.close(this.currentPanel);
    }
  }

  /**
   * Build from Makefile file
   * @param message the JSON message sent from the webview
   */
  private async buildMake(message: RequestMessage<any>): Promise<void> {
    const { args } = message;
    if (args) {
      const { inst } = args;
      StreamsBuild.runBuildMake(inst, this.filePaths, this.postBuildAction);
      super.close(this.currentPanel);
    }
  }

  /**
   * Submit application bundles
   * @param message the JSON message sent from the webview
   */
  private submit(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { inst } = args;
      StreamsBuild.runSubmit(inst, this.filePaths);
      super.close(this.currentPanel);
    }
  }

  /**
   * Upload application bundle
   * @param message the JSON message sent from the webview
   */
  private uploadBundleCpd(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { inst } = args;
      StreamsBuild.runUploadApplicationBundle(inst, this.filePaths[0]);
      super.close(this.currentPanel);
    }
  }

  /**
   * Build edge application image(s) from application bundle(s)
   * @param message the JSON message sent from the webview
   */
  private buildImage(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { inst } = args;
      StreamsBuild.runBuildImage(inst, this.filePaths, null);
      super.close(this.currentPanel);
    }
  }

  /**
   * Build a toolkit
   * @param message the JSON message sent from the webview
   */
  private buildToolkit(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { inst } = args;
      StreamsBuild.runBuildToolkit(inst, this.filePaths[0]);
      super.close(this.currentPanel);
    }
  }

  /**
   * Build a primitive operator
   * @param message the JSON message sent from the webview
   */
  private buildPrimitiveOperator(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { inst } = args;
      const { operatorType } = this.args;
      StreamsBuild.runBuildPrimitiveOperator(
        inst,
        operatorType,
        this.filePaths[0]
      );
      super.close(this.currentPanel);
    }
  }

  /**
   * Make a C++ primitive operator
   * @param message the JSON message sent from the webview
   */
  private makeCppPrimitiveOperator(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      const { inst } = args;
      const { operatorFolderPath, genericOperator, resolve } = this.args;
      StreamsBuild.runMakeCppPrimitiveOperator(
        inst,
        this.filePaths[0],
        operatorFolderPath,
        genericOperator,
        resolve
      );
      super.close(this.currentPanel);
    }
  }

  private getFiles(): any[] {
    const workspaceFolders = workspace.workspaceFolders
      ? _map(
          workspace.workspaceFolders,
          (folder: WorkspaceFolder) => folder.uri.fsPath
        )
      : [];
    const filePathStrings = [];
    for (let i = 0; i < this.filePaths.length; i++) {
      const appRoot = SourceArchiveUtils.getApplicationRoot(
        workspaceFolders,
        this.filePaths[i],
        false
      );
      const displayPath = StreamsBuild.getDisplayPath(
        appRoot,
        this.filePaths[i],
        null,
        null
      );
      filePathStrings.push(displayPath);
    }
    return filePathStrings;
  }
}
