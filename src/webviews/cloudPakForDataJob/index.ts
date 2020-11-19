import {
  CloudPakForDataJobType,
  CpdJob,
  InstanceSelector,
  store,
  StreamsUtils
} from '@ibmstreams/common';
import * as fs from 'fs-extra';
import _has from 'lodash/has';
import * as path from 'path';
import {
  commands,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace
} from 'vscode';
import { BuiltInCommands, VSCode } from '../../utils';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

/**
 * Message command identifier
 */
enum MessageCommand {
  ClosePanel = 'close-panel',
  GetAppInfo = 'get-app-info',
  BrowseForFile = 'browse-for-file',
  CheckIfSabFileIsValid = 'check-if-sab-file-is-valid',
  CheckIfValidJson = 'check-if-valid-json',
  GetSubmissionTimeParameters = 'get-submission-time-parameters',
  ImportJobConfigOverlayFile = 'import-job-config-overlay-file',
  ExportJobConfigOverlayFile = 'export-job-config-overlay-file',
  CopyToClipboard = 'copy-to-clipboard',
  CreateJob = 'create-job',
  EditJob = 'edit-job',
  StartRun = 'start-run',
  RunAction = 'run-action'
}

/**
 * Job action
 */
export enum JobAction {
  CreateAndConfigureRun = 'createAndConfigureRun',
  Edit = 'edit',
  ConfigureRun = 'configureRun'
}

/**
 * Job arguments
 */
export interface JobArgs {
  bundleFilePath: string;
  job: any;
  space: any;
  project: any;
}

/**
 * Manages the webview panel for a Cloud Pak for Data job.
 */
export class CloudPakForDataJobPanel extends BaseWebviewPanel {
  public static panels: CloudPakForDataJobPanel[] = [];
  public static panelIdCounter = 0;
  private static readonly type = WebviewType.CloudPakForDataJob;

  /**
   * @param panel the webview panel
   * @param context the extension context
   * @param connectionId the target Streams instance connection identifier
   * @param jobAction the job action
   * @param args extra arguments
   * @param resolve the promise resolve function
   */
  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private connectionId: string,
    private jobAction: JobAction,
    public args: JobArgs,
    private resolve: Function
  ) {
    super(panel, context);
    this.setHtml();
  }

  /**
   * Create or show the webview
   * @param context the extension context
   * @param connectionId the target Streams instance connection identifier
   * @param jobAction the job action
   * @param args extra arguments
   * @param resolve the promise resolve function
   */
  public static createOrShow(
    context: ExtensionContext,
    connectionId: string,
    jobAction: JobAction,
    args: JobArgs,
    resolve: Function
  ): void {
    let bundleFilePath = null;
    let job = null;
    let space = null;
    let project = null;
    if (args) {
      ({ bundleFilePath, job, space, project } = args);
    }

    let title;
    switch (jobAction) {
      case JobAction.CreateAndConfigureRun:
        title = `Submit an IBM Cloud Pak for Data Streams job${
          bundleFilePath
            ? `: ${
                path.basename(bundleFilePath).length > 30
                  ? `${path.basename(bundleFilePath).substring(0, 29)}...`
                  : path.basename(bundleFilePath)
              }`
            : ''
        }`;
        break;
      case JobAction.Edit:
        title = `Edit an IBM Cloud Pak for Data Streams job definition: ${
          job.metadata.name.length > 30
            ? `${job.metadata.name.substring(0, 29)}...`
            : job.metadata.name
        }`;
        break;
      case JobAction.ConfigureRun:
        title = `Configure a run for IBM Cloud Pak for Data Streams job definition: ${
          job.metadata.name.length > 30
            ? `${job.metadata.name.substring(0, 29)}...`
            : job.metadata.name
        }`;
        break;
      default:
        break;
    }

    // Show the panel if it already exists
    const matchFn = (panel: CloudPakForDataJobPanel): boolean => {
      if (
        panel.jobAction !== jobAction ||
        panel.connectionId !== connectionId
      ) {
        return false;
      }
      if (jobAction === JobAction.CreateAndConfigureRun) {
        return bundleFilePath
          ? panel.args?.bundleFilePath === bundleFilePath
          : panel.args?.bundleFilePath === undefined;
      }
      return (
        panel?.args?.job?.metadata?.asset_id === job.metadata.asset_id &&
        panel?.args?.space?.metadata?.id === space?.metadata?.id &&
        panel?.args?.project?.metadata?.guid === project?.metadata?.guid
      );
    };
    const existingPanel = this.panels.find(matchFn);
    if (existingPanel) {
      existingPanel.currentPanel.panel.reveal(ViewColumn.Active);
      return;
    }

    // Otherwise, create a new panel
    const panel = super.createWebview(context.extensionPath, this.type, title);
    const cloudPakForDataJobPanel = new CloudPakForDataJobPanel(
      panel,
      context,
      connectionId,
      jobAction,
      args,
      resolve
    );
    cloudPakForDataJobPanel.setCurrentPanel(cloudPakForDataJobPanel);
    this.panels.push(cloudPakForDataJobPanel);
  }

  protected dispose(): void {
    CloudPakForDataJobPanel.panels = CloudPakForDataJobPanel.panels.filter(
      (panel: CloudPakForDataJobPanel) =>
        panel.currentPanel.currentPanelId !== this.currentPanelId
    );
    this.currentPanel = undefined;
    super.dispose();
  }

  protected async setHtml(): Promise<void> {
    const cpdJobType = this.args?.project
      ? CloudPakForDataJobType.Project
      : CloudPakForDataJobType.Space;
    const cpdSpaces = InstanceSelector.selectCloudPakForDataSpacesOrProjects(
      store.getState(),
      this.connectionId,
      CloudPakForDataJobType.Space
    );
    let cpdSpaceId;
    let cpdProjectId;

    const params: any = {
      jobAction: this.jobAction,
      instanceName: InstanceSelector.selectInstanceName(
        store.getState(),
        this.connectionId
      ),
      jobType: cpdJobType
    };

    if (this.jobAction === JobAction.CreateAndConfigureRun) {
      // Use the default space for the instance
      const cpdSpace = cpdSpaces && cpdSpaces.length ? cpdSpaces[0] : null;
      cpdSpaceId = cpdSpace ? cpdSpace.metadata.id : null;
      params.space = cpdSpace || null;

      params.jobNames = cpdSpace
        ? cpdSpace.jobs.map((job) => job.metadata.name)
        : [];
      params.bundleFilePath = this?.args?.bundleFilePath || null;
    } else if (
      this.jobAction === JobAction.Edit ||
      this.jobAction === JobAction.ConfigureRun
    ) {
      if (cpdJobType === CloudPakForDataJobType.Space) {
        const cpdSpace = cpdSpaces && cpdSpaces.length ? cpdSpaces[0] : null;
        cpdSpaceId = cpdSpace ? cpdSpace.metadata.id : null;
        params.space = cpdSpace || null;

        params.jobNames = cpdSpace
          ? cpdSpace.jobs.map((job) => job.metadata.name)
          : [];
      } else {
        const cpdProjects = InstanceSelector.selectCloudPakForDataSpacesOrProjects(
          store.getState(),
          this.connectionId,
          CloudPakForDataJobType.Project
        );
        const cpdProject = cpdProjects.find(
          (cpdProject: any) =>
            cpdProject.metadata.guid === this.args.project.metadata.guid
        );
        cpdProjectId = cpdProject ? cpdProject.metadata.guid : null;
        params.project = cpdProject || null;

        params.jobNames = cpdProject
          ? cpdProject.jobs.map((job) => job.metadata.name)
          : [];
      }

      const cpdJobId = this.args.job.metadata.asset_id;
      const cpdJobname = this.args.job.metadata.name;

      params.jobName = cpdJobname;
      params.jobDescription = this?.args?.job?.metadata?.description || null;

      // Get information about the job application bundle
      const appBundleAsset = InstanceSelector.selectCloudPakForDataJobApplicationAssetInSpace(
        store.getState(),
        this.connectionId,
        cpdJobType,
        cpdSpaceId || cpdProjectId,
        cpdJobId
      );
      if (appBundleAsset) {
        const bundleName = appBundleAsset.path.replace(`jobs/${cpdJobId}/`, '');
        params.appBundle = {
          name: bundleName,
          lastModified: new Date(appBundleAsset.last_modified).toLocaleString()
        };
      } else {
        params.appBundle = null;
      }

      // Get information about the job confguration overlay
      params.jobConfigurationOverlay =
        this?.args?.job?.entity?.job?.configuration?.jobConfigurationOverlay ||
        null;
    }
    super.setHtml(params);
  }

  protected handleMessage(message: RequestMessage<any>): any {
    switch (message.command) {
      case MessageCommand.ClosePanel:
        return this.handleClosePanelMessage();
      case MessageCommand.GetAppInfo:
        return this.getAppInfo(message);
      case MessageCommand.BrowseForFile:
        return this.browseForFile(message);
      case MessageCommand.CheckIfSabFileIsValid:
        return this.checkIfSabFileIsValid(message);
      case MessageCommand.CheckIfValidJson:
        return this.checkIfValidJson(message);
      case MessageCommand.GetSubmissionTimeParameters:
        return this.getSubmissionTimeParameters(message);
      case MessageCommand.ImportJobConfigOverlayFile:
        return this.importJobConfigOverlayFile(message);
      case MessageCommand.ExportJobConfigOverlayFile:
        return this.exportJobConfigOverlayFile(message);
      case MessageCommand.CopyToClipboard:
        return this.copyToClipboard(message);
      case MessageCommand.CreateJob:
      case MessageCommand.EditJob:
      case MessageCommand.StartRun:
      case MessageCommand.RunAction:
        return this.runAction(message);
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
   * Get application information
   * @param message the JSON message sent from the webview
   */
  private async getAppInfo(message: RequestMessage<any>): Promise<any> {
    const spaceId = this.args?.space?.metadata?.id;
    const projectId = this.args?.project?.metadata?.guid;
    const jobId = this.args.job.metadata.asset_id;

    const submissionTimeParams = await store.dispatch(
      CpdJob.getSubmissionTimeValuesForJobApplication(
        this.connectionId,
        spaceId ? CloudPakForDataJobType.Space : CloudPakForDataJobType.Project,
        spaceId || projectId,
        jobId,
        this.args.job.metadata.name
      )
    );

    super.replyMessage(message, {
      submissionTimeParams
    });
  }

  /**
   * Browse for a file
   * @param message the JSON message sent from the webview
   */
  private browseForFile(message: RequestMessage<any>): Thenable<any> {
    const { args } = message;
    if (args) {
      const { filters } = args;
      const { workspaceFolders } = workspace;
      const defaultUri =
        workspaceFolders && workspaceFolders.length
          ? workspaceFolders[0].uri
          : null;
      const options = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters,
        openLabel: 'Select file',
        defaultUri
      };
      return window.showOpenDialog(options).then((uris: Uri[]) => {
        if (uris && uris.length) {
          return super.replyMessage(message, uris[0].fsPath);
        }
        return super.replyMessage(message, null);
      });
    }
  }

  /**
   * Check if a Streams application bundle file is valid
   * @param message the JSON message sent from the webview
   */
  private async checkIfSabFileIsValid(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { filePath } = args;
      const fileExists = fs.existsSync(filePath);
      if (!fileExists) {
        return super.replyMessage(message, false);
      }
      const isFile = fs.lstatSync(filePath).isFile();
      if (!isFile) {
        return super.replyMessage(message, false);
      }
      if (path.extname(filePath) !== '.sab') {
        return super.replyMessage(message, false);
      }
      return super.replyMessage(message, true);
    }
  }

  /**
   * Check if the job configuration overlay file is valid JSON
   * @param message the JSON message sent from the webview
   */
  private async checkIfValidJson(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { jobConfigOverlayFilePath } = args;
      try {
        const json = JSON.parse(
          fs.readFileSync(jobConfigOverlayFilePath, 'utf8')
        );
        if (_has(json, 'jobConfigOverlays')) {
          return super.replyMessage(message, {
            isValid: true,
            error: null
          });
        } else {
          super.replyMessage(message, {
            isValid: false,
            error: 'This file is not a valid job configuration overlay file.'
          });
        }
      } catch (err) {
        const jsonError = err && err.message ? ` ${err.message.trim()}` : '';
        const error = `This file is not a valid JSON file.${jsonError}`;
        super.replyMessage(message, {
          isValid: false,
          error: error.endsWith('.') ? error : `${error}.`
        });
      }
    }
  }

  /**
   * Get submission-time parameters from an application bundle (`.sab`)
   * @param message the JSON message sent from the webview
   */
  private async getSubmissionTimeParameters(
    message: RequestMessage<any>
  ): Promise<boolean> {
    const { args } = message;
    if (args) {
      const { filePath } = args;
      const parameters = await StreamsUtils.getSubmissionTimeParametersFromBundleFile(
        filePath
      );
      return super.replyMessage(message, parameters);
    }
  }

  /**
   * Import job configuration overlay file
   * @param message the JSON message sent from the webview
   */
  private importJobConfigOverlayFile(
    message: RequestMessage<any>
  ): Thenable<any> {
    const { args } = message;
    if (args) {
      const { filters } = args;
      const { workspaceFolders } = workspace;
      const defaultUri =
        workspaceFolders && workspaceFolders.length
          ? workspaceFolders[0].uri
          : null;
      const options = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters,
        openLabel: 'Select file',
        defaultUri
      };
      return window.showOpenDialog(options).then((uris: Uri[]) => {
        if (uris && uris.length) {
          const filePath = uris[0].fsPath;
          let selectedFile = null;
          const fileName = path.basename(filePath);
          try {
            const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (_has(json, 'jobConfigOverlays')) {
              selectedFile = {
                fileName,
                json,
                error: null,
                errorLink: false
              };
            } else {
              selectedFile = {
                fileName,
                json: null,
                error:
                  'Not a valid job configuration overlay file. Learn more ',
                errorLink: true
              };
            }
          } catch (err) {
            const error = `Not valid JSON.${
              err && err.message ? ` ${err.message.trim()}` : ''
            }`;
            selectedFile = {
              fileName,
              json: null,
              error: error.endsWith('.') ? error : `${error}.`,
              errorLink: false
            };
          }
          return super.replyMessage(message, selectedFile);
        }
      });
    }
  }

  /**
   * Export job configuration overlay file
   * @param message the JSON message sent from the webview
   */
  private exportJobConfigOverlayFile(
    message: RequestMessage<any>
  ): Thenable<any> {
    const { args } = message;
    if (args) {
      const {
        appBundleFilePath,
        fileName,
        fileContent,
        fileType,
        buttonLabel
      } = args;
      const bundleFolderPath = path.dirname(appBundleFilePath);
      const options = {
        defaultUri: Uri.file(path.join(bundleFolderPath, fileName)),
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
   * Copy a value to the clipboard
   * @param message the JSON message sent from the webview
   */
  private async copyToClipboard(message: RequestMessage<any>): Promise<void> {
    const { args } = message;
    if (args) {
      const { value } = args;
      await VSCode.copyToClipboard(value);
    }
  }

  /**
   * Run the action
   * @param message the JSON message sent from the webview
   */
  private runAction(message: RequestMessage<any>): void {
    const { args } = message;
    if (args) {
      super.close(this.currentPanel);
      this.resolve(args);
    }
  }
}
