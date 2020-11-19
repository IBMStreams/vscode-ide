import {
  getStreamsInstance,
  InstanceSelector,
  store
} from '@ibmstreams/common';
import * as fs from 'fs';
import _has from 'lodash/has';
import * as os from 'os';
import * as path from 'path';
import { commands, ExtensionContext, Uri, WebviewPanel, window } from 'vscode';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';
import { BuiltInCommands, Logger } from '../../utils';

/**
 * Message command identifier
 */
enum MessageCommand {
  ClosePanel = 'close-panel',
  GetJobGroups = 'get-job-groups',
  SubmitJob = 'submit-job',
  ImportJco = 'import-jco',
  SaveFile = 'save-file',
  ShowNotification = 'show-notification'
}

interface SubmitJobProperties {
  name: string;
  details: any;
  submissionTimeParameters: any[];
  submitCallbackFn: Function;
  targetInstance: any;
}

interface SubmitJobOptions {
  jobConfig: any;
}

interface SaveFileOptions {
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
export default class ConfigureJobSubmissionPanel extends BaseWebviewPanel {
  public static panels: ConfigureJobSubmissionPanel[] = [];
  public static panelIdCounter = 0;
  private static readonly type = WebviewType.ConfigureJobSubmission;
  private static readonly titlePrefix = 'Submit Job';

  /**
   * @param panel the webview panel
   * @param context the extension context
   * @param properties the job configuration properties
   */
  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private properties: SubmitJobProperties
  ) {
    super(panel, context);
    this.currentPanelId = ++ConfigureJobSubmissionPanel.panelIdCounter;
    this.setHtml();
  }

  /**
   * Create or show the webview
   * @param context the extension context
   * @param properties the job configuration properties
   */
  public static createOrShow(
    context: ExtensionContext,
    properties: SubmitJobProperties
  ): void {
    const title =
      properties && properties.name
        ? `${this.titlePrefix}: ${
            properties.name.length > 30
              ? `${properties.name.substring(0, 29)}...`
              : properties.name
          }`
        : this.titlePrefix;
    const panel = super.createWebview(context.extensionPath, this.type, title);
    const configureJobSubmissionPanel = new ConfigureJobSubmissionPanel(
      panel,
      context,
      properties
    );
    configureJobSubmissionPanel.setCurrentPanel(configureJobSubmissionPanel);
    this.panels.push(configureJobSubmissionPanel);
  }

  protected dispose(): void {
    ConfigureJobSubmissionPanel.panels = ConfigureJobSubmissionPanel.panels.filter(
      (panel: ConfigureJobSubmissionPanel) =>
        panel.currentPanel.currentPanelId !== this.currentPanelId
    );
    this.currentPanel = undefined;
    super.dispose();
  }

  protected setHtml(): void {
    super.setHtml(this.properties);
  }

  protected handleMessage(message: RequestMessage<any>): any {
    switch (message.command) {
      case MessageCommand.ClosePanel:
        return this.handleClosePanelMessage();
      case MessageCommand.GetJobGroups:
        return this.handleGetJobGroups(message);
      case MessageCommand.SubmitJob:
        return this.handleSubmitJobMessage(message);
      case MessageCommand.ImportJco:
        return this.handleImportJcoMessage(message);
      case MessageCommand.SaveFile:
        return this.handleSaveFileMessage(message);
      case MessageCommand.ShowNotification:
        return this.handleShowNotificationMessage(message);
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
   * Handle a get job groups message
   * @param message the JSON message sent from the webview
   */
  private async handleGetJobGroups(
    message: RequestMessage<any>
  ): Promise<void> {
    const { connectionId } = this.properties.targetInstance;
    await store.dispatch(getStreamsInstance(connectionId, false, false));
    const { streamsJobGroups } = InstanceSelector.selectStreamsInstanceInfo(
      store.getState(),
      connectionId
    );
    super.replyMessage(message, streamsJobGroups);
  }

  /**
   * Handle a submit job message
   * @param message the JSON message sent from the webview
   */
  private handleSubmitJobMessage(message: RequestMessage<any>): void {
    const { args }: { args: SubmitJobOptions } = message;
    if (args) {
      const { jobConfig } = args;
      this.properties.submitCallbackFn(jobConfig);
    }
  }

  /**
   * Handle an import JCO message
   * @param message the JSON message sent from the webview
   */
  private async handleImportJcoMessage(
    message: RequestMessage<any>
  ): Promise<any> {
    const dirPath = this.getDirPath();
    const options = {
      canSelectMany: false,
      defaultUri: Uri.file(dirPath),
      filters: { JSON: ['json'] },
      openLabel: 'Import'
    };
    return window.showOpenDialog(options).then((uris: Uri[]) => {
      if (uris && uris.length) {
        const [selectedJco] = uris;
        const jcoFilePath = selectedJco.fsPath;
        const jcoFileName = path.basename(jcoFilePath);
        try {
          const json = JSON.parse(fs.readFileSync(jcoFilePath, 'utf8'));
          if (_has(json, 'jobConfigOverlays')) {
            super.replyMessage(message, {
              fileName: jcoFileName,
              json,
              error: null,
              errorLink: false
            });
          } else {
            super.replyMessage(message, {
              fileName: jcoFileName,
              json: null,
              error: 'Not a valid job configuration overlay file. Learn more ',
              errorLink: true
            });
          }
        } catch (err) {
          const error = `Not valid JSON.${
            err && err.message ? ` ${err.message.trim()}` : ''
          }`;
          super.replyMessage(message, {
            fileName: jcoFileName,
            json: null,
            error: error.endsWith('.') ? error : `${error}.`,
            errorLink: false
          });
        }
      }
    });
  }

  /**
   * Handle a save data message
   * @param message the JSON message sent from the webview
   */
  private async handleSaveFileMessage(
    message: RequestMessage<any>
  ): Promise<any> {
    const { args }: { args: SaveFileOptions } = message;
    if (args) {
      const { fileName, fileContent, fileType, buttonLabel } = args;
      const dirPath = this.getDirPath();
      const options = {
        defaultUri: Uri.file(path.join(dirPath, fileName)),
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
   * @param message the JSON message sent from the webview
   */
  private handleShowNotificationMessage(message: RequestMessage<any>): void {
    const { args }: { args: ShowNotificationOptions } = message;
    if (args) {
      const { type, message: notificationMessage } = args;
      Logger[type](null, notificationMessage, true);
    }
  }

  /**
   * Get directory path to use for importing and exporting job configuration overlay files
   */
  private getDirPath(): string {
    const { details } = this.properties;
    const bundlePathProp = 'Bundle path';
    const appRootProp = 'Application root';
    if (details && _has(details, bundlePathProp)) {
      // Submission from application bundle
      const bundlePath = details[bundlePathProp];
      return path.dirname(bundlePath);
    } else if (details && _has(details, appRootProp)) {
      // Submission from build artifact
      const appRoot = details[appRootProp];
      return appRoot;
    } else {
      // Default
      return os.homedir();
    }
  }
}
