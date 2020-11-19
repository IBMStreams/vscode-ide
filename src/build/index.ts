import {
  Build,
  BuildImage,
  BuildToolkit,
  BuildType,
  CloudPakForDataJobType,
  CpdJob as CpdJobCommon,
  Editor,
  EditorAction,
  EditorCommand,
  EditorSelector,
  generateRandomId,
  Instance,
  InstanceSelector,
  PostBuildAction,
  PrimitiveOperatorType,
  refreshCloudPakForDataSpacesAndProjects,
  Registry,
  SourceArchiveUtils,
  store,
  StreamsInstanceType,
  StreamsRest,
  StreamsUtils,
  SubmitJob,
  ToolkitUtils
} from '@ibmstreams/common';
import * as fs from 'fs';
import * as os from 'os';
import * as glob from 'glob';
import _map from 'lodash/map';
import _omit from 'lodash/omit';
import _some from 'lodash/some';
import * as path from 'path';
import {
  commands,
  ConfigurationChangeEvent,
  env,
  ExtensionContext,
  Uri,
  window,
  workspace,
  WorkspaceFolder
} from 'vscode';
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';
import * as packageJson from '../../package.json';
import { Commands } from '../commands';
import SplLanguageClient from '../languageClient';
import { CpdJob, Streams, StreamsInstance } from '../streams';
import {
  ActionType,
  Authentication,
  Configuration,
  DOC_BASE_URL,
  EXTENSION_ID,
  isLoggingEnabled,
  Keychain,
  LANGUAGE_SPL,
  Logger,
  Settings,
  TOOLKITS_CACHE_DIR,
  VSCode
} from '../utils';
import { getStreamsExplorer } from '../views';
import LintHandler from './LintHandler';
import MessageHandler from './MessageHandler';

/**
 * Handles Streams builds and submissions
 */
export default class StreamsBuild {
  private static _context: ExtensionContext;
  public static _streamingAnalyticsCredentials: string;
  private static _toolkitPaths: string;
  private static _defaultMessageHandler: MessageHandler;
  private static _openUrlHandler: (url: string, callback?: () => void) => void;
  private static _sendLspNotificationHandler: (param: object) => void;

  /**
   * Perform initial configuration
   * @param context the extension context
   */
  public static async configure(context: ExtensionContext): Promise<void> {
    this._context = context;

    if (!fs.existsSync(TOOLKITS_CACHE_DIR)) {
      fs.mkdirSync(TOOLKITS_CACHE_DIR);
    }

    const toolkitPathsSetting = Configuration.getSetting(
      Settings.ENV_TOOLKIT_PATHS
    );
    this._toolkitPaths =
      toolkitPathsSetting !== '' &&
      toolkitPathsSetting !== Settings.ENV_TOOLKIT_PATHS_DEFAULT
        ? toolkitPathsSetting
        : null;

    const timeout = Configuration.getSetting(Settings.ENV_TIMEOUT_FOR_REQUESTS);
    StreamsRest.setRequestTimeout(timeout);

    this.initUtilRegistry();
    this.monitorConfigSettingChanges();
    await this.initReduxState();
    this.monitorOpenSplFile();
  }

  /**
   * Add a toolkit to the Streams build service
   * @param selectedPath    The selected path
   */
  public static async addToolkitToBuildService(
    selectedPath: string
  ): Promise<void> {
    const messageHandler = Registry.getDefaultMessageHandler();
    messageHandler.handleInfo(
      'Received request to add a toolkit to the build service.',
      { showNotification: false }
    );

    // Check for default instance
    if (!Streams.getInstances().length) {
      const notificationButtons = [
        {
          label: 'Add Instance',
          callbackFn: (): void => {
            const queuedActionId = generateRandomId('queuedAction');
            store.dispatch(
              EditorAction.addQueuedAction({
                id: queuedActionId,
                action: Editor.executeCallbackFn(() =>
                  this.addToolkitToBuildService(selectedPath)
                )
              })
            );
            StreamsInstance.authenticate(null, false, queuedActionId);
          }
        }
      ];
      const message =
        'There are no Streams instances available. Add an instance to continue with adding a toolkit.';
      messageHandler.handleInfo(message, { notificationButtons });
    } else if (!Streams.getDefaultInstanceEnv()) {
      window
        .showWarningMessage(
          `A default Streams instance has not been set.`,
          'Set Default'
        )
        .then((selection: string) => {
          if (selection) {
            window
              .showQuickPick(
                Streams.getQuickPickItems(Streams.getInstances()),
                {
                  canPickMany: false,
                  ignoreFocusOut: true,
                  placeHolder: 'Select a Streams instance to set as the default'
                }
              )
              .then(
                async (item: any): Promise<void> => {
                  if (item) {
                    StreamsInstance.setDefaultInstance(item);
                    return this.addToolkitToBuildService(selectedPath);
                  }
                }
              );
          }
          return null;
        });
    } else {
      let defaultUri;
      if (selectedPath) {
        defaultUri = fs.lstatSync(selectedPath).isDirectory()
          ? Uri.file(selectedPath)
          : Uri.file(path.dirname(selectedPath));
      }
      const selected = await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        ...(defaultUri && { defaultUri }),
        openLabel: 'Set as toolkit folder'
      });
      const toolkitFolderUri = selected && selected.length ? selected[0] : null;
      if (toolkitFolderUri) {
        let toolkitFolderPath = toolkitFolderUri.path;
        if (os.platform() === 'win32' && toolkitFolderPath.charAt(0) === '/') {
          toolkitFolderPath = toolkitFolderPath.substring(1);
        }
        messageHandler.handleInfo(`Selected: ${toolkitFolderPath}`, {
          showNotification: false
        });
        const defaultInstance = Streams.checkDefaultInstance();
        if (!defaultInstance) {
          return;
        }
        this.runAddToolkitToBuildService(defaultInstance, toolkitFolderPath);
      }
    }
  }

  /**
   * Handle adding a toolkit to the Streams build service
   * @param targetInstance       The target Streams instance
   * @param toolkitFolderPath    The toolkit folder path
   */
  public static async runAddToolkitToBuildService(
    targetInstance: any,
    toolkitFolderPath: string
  ): Promise<void> {
    const addToolkitToBuildService = (): void => {
      if (targetInstance) {
        const startAddAction = Build.addToolkitToBuildService({
          folderPath: toolkitFolderPath,
          targetInstance
        });
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(addToolkitToBuildService)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          store
            .dispatch(startAddAction)
            .then(async () => {
              // Refresh the toolkits
              setTimeout(async () => {
                await ToolkitUtils.refreshToolkits(targetInstance.connectionId);
                getStreamsExplorer().refreshToolkitsView();
              }, 10000);
            })
            .catch((err) => {
              const instanceName = InstanceSelector.selectInstanceName(
                store.getState(),
                targetInstance.connectionId
              );
              const errorMsg = `Failed to add the toolkit in the ${toolkitFolderPath} folder to the build service using the Streams instance ${instanceName}.`;
              this.handleError(
                err,
                Registry.getDefaultMessageHandler(),
                errorMsg
              );
            });
        }
      }
    };
    addToolkitToBuildService();
  }

  /**
   * Remove a toolkit from the Streams build service
   * @param selectedPath    The selected path
   */
  public static async removeToolkitsFromBuildService(): Promise<void> {
    const messageHandler = Registry.getDefaultMessageHandler();
    messageHandler.handleInfo(
      'Received request to remove toolkit(s) from the Streams build service.',
      { showNotification: false }
    );

    // Check for default instance
    if (!Streams.getInstances().length) {
      const notificationButtons = [
        {
          label: 'Add Instance',
          callbackFn: (): void => {
            const queuedActionId = generateRandomId('queuedAction');
            store.dispatch(
              EditorAction.addQueuedAction({
                id: queuedActionId,
                action: Editor.executeCallbackFn(() =>
                  this.removeToolkitsFromBuildService()
                )
              })
            );
            StreamsInstance.authenticate(null, false, queuedActionId);
          }
        }
      ];
      const message =
        'There are no Streams instances available. Add an instance to continue with removing a toolkit.';
      messageHandler.handleInfo(message, { notificationButtons });
    } else if (!Streams.getDefaultInstanceEnv()) {
      window
        .showWarningMessage(
          `A default Streams instance has not been set.`,
          'Set Default'
        )
        .then((selection: string) => {
          if (selection) {
            window
              .showQuickPick(
                Streams.getQuickPickItems(Streams.getInstances()),
                {
                  canPickMany: false,
                  ignoreFocusOut: true,
                  placeHolder: 'Select a Streams instance to set as the default'
                }
              )
              .then(
                async (item: any): Promise<void> => {
                  if (item) {
                    StreamsInstance.setDefaultInstance(item);
                    return this.removeToolkitsFromBuildService();
                  }
                }
              );
          }
          return null;
        });
    } else {
      const defaultInstance = Streams.checkDefaultInstance();
      if (!defaultInstance) {
        return;
      }
      this.runRemoveToolkitsFromBuildService(defaultInstance);
    }
  }

  /**
   * Handle removing a toolkit from the Streams build service
   * @param targetInstance    The target Streams instance
   */
  public static async runRemoveToolkitsFromBuildService(
    targetInstance: any
  ): Promise<void> {
    const removeToolkitsFromBuildService = (): void => {
      if (targetInstance) {
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(removeToolkitsFromBuildService)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          const instanceName = InstanceSelector.selectInstanceName(
            store.getState(),
            targetInstance.connectionId
          );
          const toolkits = InstanceSelector.selectBuildServiceToolkits(
            store.getState(),
            targetInstance.connectionId
          );
          const userToolkitItems = toolkits
            .filter((toolkit) => toolkit.id.startsWith('streams-toolkits/'))
            .map((toolkit) => ({
              label: toolkit.name,
              description: toolkit.version,
              toolkit
            }));
          if (userToolkitItems.length > 0) {
            window
              .showQuickPick(userToolkitItems, {
                canPickMany: true,
                ignoreFocusOut: true,
                placeHolder:
                  'Select one or more Streams build service toolkits to remove'
              })
              .then(
                async (items: Array<any>): Promise<void> => {
                  if (items) {
                    const toolkits = items.map((item) => item.toolkit);
                    const startRemoveAction = Build.removeToolkitsFromBuildService(
                      {
                        removedToolkits: toolkits,
                        targetInstance
                      }
                    );
                    store
                      .dispatch(startRemoveAction)
                      .then(async () => {
                        // Refresh the toolkits
                        setTimeout(async () => {
                          await ToolkitUtils.refreshToolkits(
                            targetInstance.connectionId
                          );
                          getStreamsExplorer().refreshToolkitsView();
                        }, 10000);
                      })
                      .catch((err) => {
                        const instanceName = InstanceSelector.selectInstanceName(
                          store.getState(),
                          targetInstance.connectionId
                        );
                        const errorMsg = `Failed to remove the toolkit(s) from the build service using the Streams instance ${instanceName}.`;
                        this.handleError(
                          err,
                          Registry.getDefaultMessageHandler(),
                          errorMsg
                        );
                      });
                  }
                }
              );
          } else {
            this._defaultMessageHandler.handleInfo(
              `There are no build service toolkits available to remove from the Streams instance ${instanceName}.`
            );
          }
        }
      }
    };
    removeToolkitsFromBuildService();
  }

  /**
   * Perform a build of an SPL file and either download the bundle or submit the application
   * @param filePath the path to the SPL file
   * @param action the post-build action to take
   */
  public static async buildApp(
    filePath: string,
    action: PostBuildAction
  ): Promise<void> {
    await this.checkIfDirty();
    Streams.checkDefaultInstance();
    if (filePath) {
      const filePaths = [filePath];
      const zeroOrOneInstancesCallbackFn = this.getZeroOrOneInstancesCallbackFn(
        action,
        (instance: any) => {
          this.runBuildApp(instance, filePaths, action);
        },
        () => {
          this.buildApp(filePath, action);
        }
      );
      const multipleInstancesCallbackFn = (): void => {
        this.showInstancePanel(ActionType.BuildApp, filePaths, action);
      };
      this.handleAction(
        ActionType.BuildApp,
        action,
        zeroOrOneInstancesCallbackFn,
        multipleInstancesCallbackFn
      );
    } else {
      this._defaultMessageHandler.handleError(
        'The build failed. Unable to retrieve the application file path.'
      );
    }
  }

  /**
   * Handle building of an application
   * @param targetInstance the target Streams instance
   * @param filePaths the selected file paths
   * @param action the post-build action to take
   */
  public static async runBuildApp(
    targetInstance: any,
    filePaths: string[],
    action: PostBuildAction
  ): Promise<void> {
    const { appRoot, compositeToBuild, messageHandler } = await this.initBuild(
      'buildApp',
      filePaths[0],
      action
    );
    action =
      action === PostBuildAction.Submit &&
      Streams.doesInstanceHaveCpdSpacesSupport(targetInstance)
        ? PostBuildAction.SubmitCpd
        : action;
    const buildApp = (): void => {
      if (targetInstance) {
        const startBuildAction = Build.startBuild({
          appRoot,
          fqn: compositeToBuild,
          makefilePath: null,
          postBuildAction: action,
          targetInstance
        });
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(buildApp)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          messageHandler.handleInfo(
            `Selected Streams instance: ${InstanceSelector.selectInstanceName(
              store.getState(),
              targetInstance.connectionId
            )}.`,
            { showNotification: false }
          );
          store
            .dispatch(startBuildAction)
            .then((buildResults) => {
              if (action === PostBuildAction.Submit) {
                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                return;
              }
              if (action === PostBuildAction.SubmitCpd) {
                if (buildResults && buildResults.length) {
                  StreamsBuild.runSubmit(targetInstance, buildResults);
                }
                return;
              }
              if (
                action === PostBuildAction.BuildImage &&
                buildResults &&
                buildResults.length
              ) {
                buildResults.forEach(
                  ({
                    bundlePath,
                    artifact
                  }: {
                    bundlePath: string;
                    artifact: any;
                  }) => {
                    const newMessageHandler = bundlePath
                      ? Registry.getMessageHandler(bundlePath)
                      : messageHandler;
                    if (newMessageHandler && artifact) {
                      this.displayEdgeAppImageBuildDetails(
                        newMessageHandler,
                        artifact,
                        targetInstance.connectionId
                      );
                    }
                  }
                );
              }
            })
            .catch((err) => {
              if (action === PostBuildAction.Submit) {
                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
              }
              let errorMsg: string;
              if (
                err &&
                err.message &&
                err.message.startsWith('Failed to build')
              ) {
                errorMsg = err.message;
              } else {
                const instanceName = InstanceSelector.selectInstanceName(
                  store.getState(),
                  targetInstance.connectionId
                );
                let type = '';
                if (action === PostBuildAction.Submit) {
                  type = ' and submit';
                } else if (action === PostBuildAction.BuildImage) {
                  type = ' an image for';
                }
                errorMsg = `Failed to build${type} the application ${compositeToBuild} using the Streams instance ${instanceName}.`;
              }
              this.handleError(err, messageHandler, errorMsg);
            });
        }
      }
    };
    buildApp();
  }

  /**
   * Perform a build from a Makefile and either download the bundle(s) or submit the application(s)
   * @param filePath the path to the Makefile
   * @param action the post-build action to take
   */
  public static async buildMake(
    filePath: string,
    action: PostBuildAction
  ): Promise<void> {
    await this.checkIfDirty();
    Streams.checkDefaultInstance();
    if (filePath) {
      const filePaths = [filePath];
      const zeroOrOneInstancesCallbackFn = this.getZeroOrOneInstancesCallbackFn(
        action,
        (instance: any) => {
          this.runBuildMake(instance, filePaths, action);
        },
        () => {
          this.buildMake(filePath, action);
        }
      );
      const multipleInstancesCallbackFn = (): void => {
        this.showInstancePanel(ActionType.BuildMake, filePaths, action);
      };
      this.handleAction(
        ActionType.BuildMake,
        action,
        zeroOrOneInstancesCallbackFn,
        multipleInstancesCallbackFn
      );
    } else {
      this._defaultMessageHandler.handleError(
        'The build failed. Unable to retrieve the Makefile file path.'
      );
    }
  }

  /**
   * Handle building of a Makefile
   * @param targetInstance the target Streams instance
   * @param filePaths the selected file paths
   * @param action the post-build action to take
   */
  public static async runBuildMake(
    targetInstance: any,
    filePaths: string[],
    action: PostBuildAction
  ): Promise<void> {
    const { appRoot, messageHandler } = await StreamsBuild.initBuild(
      'buildMake',
      filePaths[0],
      action
    );
    action =
      action === PostBuildAction.Submit &&
      Streams.doesInstanceHaveCpdSpacesSupport(targetInstance)
        ? PostBuildAction.SubmitCpd
        : action;
    const buildMake = (): void => {
      if (targetInstance) {
        const startBuildAction = Build.startBuild({
          appRoot,
          fqn: null,
          makefilePath: filePaths[0],
          postBuildAction: action,
          targetInstance
        });
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(buildMake)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          messageHandler.handleInfo(
            `Selected Streams instance: ${InstanceSelector.selectInstanceName(
              store.getState(),
              targetInstance.connectionId
            )}.`,
            { showNotification: false }
          );
          store
            .dispatch(startBuildAction)
            .then((buildResults) => {
              if (action === PostBuildAction.Submit) {
                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                return;
              }
              if (action === PostBuildAction.SubmitCpd) {
                if (buildResults && buildResults.length) {
                  StreamsBuild.runSubmit(targetInstance, buildResults);
                }
                return;
              }
              if (
                action === PostBuildAction.BuildImage &&
                buildResults &&
                buildResults.length
              ) {
                buildResults.forEach(
                  ({
                    bundlePath,
                    artifact
                  }: {
                    bundlePath: string;
                    artifact: any;
                  }) => {
                    const newMessageHandler = bundlePath
                      ? Registry.getMessageHandler(bundlePath)
                      : messageHandler;
                    if (newMessageHandler && artifact) {
                      this.displayEdgeAppImageBuildDetails(
                        newMessageHandler,
                        artifact,
                        targetInstance.connectionId
                      );
                    }
                  }
                );
              }
            })
            .catch((err) => {
              if (action === PostBuildAction.Submit) {
                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
              }
              let errorMsg: string;
              if (
                err &&
                err.message &&
                err.message.startsWith('Failed to build')
              ) {
                errorMsg = err.message;
              } else {
                const identifier = `${path.basename(appRoot)}${
                  path.sep
                }${path.relative(appRoot, filePaths[0])}`;
                const instanceName = InstanceSelector.selectInstanceName(
                  store.getState(),
                  targetInstance.connectionId
                );
                let type = '';
                if (action === PostBuildAction.Submit) {
                  type = ' and submit';
                } else if (action === PostBuildAction.BuildImage) {
                  type = ' an image for';
                }
                errorMsg = `Failed to build${type} the application(s) in ${identifier} using the Streams instance ${instanceName}.`;
              }
              this.handleError(err, messageHandler, errorMsg);
            });
        }
      }
    };
    buildMake();
  }

  /**
   * Submit application bundle(s)
   * @param filePaths the paths to the application bundle(s)
   */
  public static async submit(filePaths: string[]): Promise<void> {
    if (filePaths) {
      Streams.checkDefaultInstance();
      const bundleFilePaths = this.initSubmit(filePaths);
      if (!bundleFilePaths.length) {
        this._defaultMessageHandler.handleInfo(
          'There are no Streams application bundles to submit.'
        );
        return;
      }
      const zeroOrOneInstancesCallbackFn = this.getZeroOrOneInstancesCallbackFn(
        ActionType.Submit,
        (instance: any) => {
          this.runSubmit(instance, bundleFilePaths);
        },
        () => {
          this.submit(filePaths);
        }
      );
      const multipleInstancesCallbackFn = (): void => {
        this.showInstancePanel(ActionType.Submit, bundleFilePaths, null);
      };
      this.handleAction(
        ActionType.Submit,
        null,
        zeroOrOneInstancesCallbackFn,
        multipleInstancesCallbackFn
      );
    } else {
      this._defaultMessageHandler.handleError(
        'The submission(s) failed. Unable to retrieve the application bundle file paths.'
      );
    }
  }

  /**
   * Handle submission of application bundles
   * @param targetInstance the target Streams instance
   * @param filePaths the selected file paths
   */
  public static runSubmit(
    targetInstance: any,
    bundleFilePaths: string[]
  ): void {
    const submit = async (): Promise<void> => {
      if (targetInstance) {
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(submit)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          bundleFilePaths.forEach((bundleFilePath) => {
            const messageHandler = Registry.getMessageHandler(bundleFilePath);
            if (messageHandler) {
              messageHandler.handleInfo(
                `Selected Streams instance: ${InstanceSelector.selectInstanceName(
                  store.getState(),
                  targetInstance.connectionId
                )}.`,
                { showNotification: false }
              );
            }
          });
          // Check if the instance supports CPD spaces
          if (Streams.doesInstanceHaveCpdSpacesSupport(targetInstance)) {
            try {
              await Promise.all(
                bundleFilePaths.map(async (bundleFilePath) => {
                  // Submit a Cloud Pak for Data Streams job
                  await CpdJob.submitJob(targetInstance, bundleFilePath);
                })
              );
            } catch (err) {
              CpdJob.handleError(err);
            }
          } else {
            const startSubmitJobAction = SubmitJob.startSubmitJobFromApplicationBundles(
              bundleFilePaths,
              targetInstance
            );
            store
              .dispatch(startSubmitJobAction)
              .then(() => {
                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
              })
              .catch((err) => {
                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                const getErrorMsg = (bundleFilePath: string): string => {
                  let errorMsg: string;
                  if (
                    err &&
                    err.message &&
                    err.message.startsWith('Failed to submit')
                  ) {
                    errorMsg = err.message;
                  } else {
                    const instanceName = InstanceSelector.selectInstanceName(
                      store.getState(),
                      targetInstance.connectionId
                    );
                    errorMsg = `Failed to submit the application ${path.basename(
                      bundleFilePath
                    )} to the Streams instance ${instanceName}.`;
                  }
                  return errorMsg;
                };
                bundleFilePaths.forEach((bundleFilePath) => {
                  const messageHandler = Registry.getMessageHandler(
                    bundleFilePath
                  );
                  if (messageHandler) {
                    this.handleError(
                      err,
                      messageHandler,
                      getErrorMsg(bundleFilePath)
                    );
                  }
                });
              });
          }
        }
      }
    };
    submit();
  }

  /**
   * Upload application bundle
   * @param bundleFilePath the path to the application bundle
   */
  public static async uploadApplicationBundle(
    bundleFilePath: string
  ): Promise<void> {
    if (bundleFilePath) {
      Streams.checkDefaultInstance();

      const statusMessage = 'Received request to upload an application bundle.';
      this._defaultMessageHandler.handleInfo(statusMessage, {
        showNotification: false
      });
      this._defaultMessageHandler.handleInfo(`Selected: ${bundleFilePath}`, {
        showNotification: false
      });

      const zeroOrOneInstancesCallbackFn = this.getZeroOrOneInstancesCallbackFn(
        ActionType.UploadBundleCpd,
        (instance: any) => {
          this.runUploadApplicationBundle(instance, bundleFilePath);
        },
        () => {
          this.uploadApplicationBundle(bundleFilePath);
        }
      );
      const multipleInstancesCallbackFn = (): void => {
        this.showInstancePanel(
          ActionType.UploadBundleCpd,
          [bundleFilePath],
          null
        );
      };
      this.handleAction(
        ActionType.UploadBundleCpd,
        null,
        zeroOrOneInstancesCallbackFn,
        multipleInstancesCallbackFn
      );
    } else {
      this._defaultMessageHandler.handleError(
        'The upload failed. Unable to retrieve the application bundle file path.'
      );
    }
  }

  /**
   * Handle submission of application bundles
   * @param targetInstance the target Streams instance
   * @param bundleFilePath the path to the application bundle
   */
  public static runUploadApplicationBundle(
    targetInstance: any,
    bundleFilePath: string
  ): void {
    const upload = async (): Promise<void> => {
      if (targetInstance) {
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(upload)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          const instanceName = InstanceSelector.selectInstanceName(
            store.getState(),
            targetInstance.connectionId
          );
          const instanceNamespace = InstanceSelector.selectCloudPakForDataServiceInstanceNamespace(
            store.getState(),
            targetInstance.connectionId
          );
          this._defaultMessageHandler.handleInfo(
            `Selected Streams instance: ${instanceName}.`,
            { showNotification: false }
          );

          // Prompt user to select a job
          const cpdJobItems = [];
          const cpdSpaces = InstanceSelector.selectCloudPakForDataSpacesOrProjects(
            store.getState(),
            targetInstance.connectionId,
            CloudPakForDataJobType.Space
          );
          const multipleSpaces = cpdSpaces.length > 1;
          cpdSpaces.forEach((space) => {
            const {
              entity: { name: spaceName },
              jobs
            } = space;
            const cpdJobItemsForSpace = jobs
              .filter((job) => {
                return (
                  job.metadata.name !== `${instanceName}.${instanceNamespace}`
                );
              })
              .map((job) => ({
                label: job.metadata.name,
                ...(multipleSpaces && { description: spaceName }),
                job,
                space
              }));
            cpdJobItems.push(...cpdJobItemsForSpace);
          });

          if (!cpdJobItems.length) {
            return this._defaultMessageHandler.handleInfo(
              `There are no jobs available for application bundle uploads in the Streams instance ${instanceName}.`,
              {
                notificationButtons: [
                  {
                    label: 'Create Job',
                    callbackFn: async (): Promise<void> => {
                      try {
                        await CpdJob.submitJob(targetInstance);
                      } catch (err) {
                        CpdJob.handleError(err);
                      }
                    }
                  }
                ]
              }
            );
          }

          const selectedItem = await window.showQuickPick(cpdJobItems, {
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder:
              'Select an IBM Cloud Pak for Data job definition to upload the application bundle to'
          });
          if (selectedItem) {
            const { label, job, space } = selectedItem;
            try {
              await store.dispatch(
                CpdJobCommon.updateCloudPakForDataJob(
                  targetInstance.connectionId,
                  CloudPakForDataJobType.Space,
                  space.metadata.id,
                  job.metadata.asset_id,
                  label,
                  null,
                  null,
                  bundleFilePath,
                  null
                )
              );

              await new Promise((resolve) => {
                setTimeout(async () => {
                  await store.dispatch(
                    refreshCloudPakForDataSpacesAndProjects(
                      targetInstance.connectionId
                    )
                  );
                  getStreamsExplorer().refresh();
                  resolve();
                }, 1000);
              });
            } catch (err) {
              CpdJob.handleError(err);
            }
          }
        }
      }
    };
    upload();
  }

  /**
   * Perform build(s) of edge application image(s)
   * @param filePaths the paths to the application bundle(s)
   */
  public static async buildImage(filePaths: string[]): Promise<void> {
    if (filePaths) {
      const bundleFilePaths = this.initBuildImage(filePaths);
      if (!bundleFilePaths.length) {
        this._defaultMessageHandler.handleInfo(
          'There are no Streams application bundles to build.'
        );
        return;
      }
      const zeroOrOneInstancesCallbackFn = this.getZeroOrOneInstancesCallbackFn(
        ActionType.BuildImage,
        (instance: any) => {
          this.runBuildImage(instance, bundleFilePaths, null);
        },
        () => {
          this.buildImage(filePaths);
        }
      );
      const multipleInstancesCallbackFn = (): void => {
        this.showInstancePanel(ActionType.BuildImage, bundleFilePaths, null);
      };
      this.handleAction(
        ActionType.BuildImage,
        null,
        zeroOrOneInstancesCallbackFn,
        multipleInstancesCallbackFn
      );
    } else {
      this._defaultMessageHandler.handleError(
        'The build(s) failed. Unable to retrieve the application bundle file paths.'
      );
    }
  }

  /**
   * Handle building of an edge application image
   * @param targetInstance the target Streams instance
   * @param filePaths the selected file paths
   * @param baseImage the base image
   */
  public static runBuildImage(
    targetInstance: any,
    bundleFilePaths: string[],
    baseImage = null
  ): void {
    const buildImage = (): void => {
      if (targetInstance) {
        const startBuildImageAction = BuildImage.startBuildImageFromApplicationBundles(
          bundleFilePaths,
          null,
          baseImage,
          targetInstance
        );
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(buildImage)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          bundleFilePaths.forEach((bundleFilePath) => {
            const messageHandler = Registry.getMessageHandler(bundleFilePath);
            if (messageHandler) {
              messageHandler.handleInfo(
                `Selected Streams instance: ${InstanceSelector.selectInstanceName(
                  store.getState(),
                  targetInstance.connectionId
                )}.`,
                { showNotification: false }
              );
            }
          });
          store
            .dispatch(startBuildImageAction)
            .then((buildResults) => {
              if (buildResults && buildResults.length) {
                buildResults.forEach(
                  ({
                    bundlePath,
                    artifact
                  }: {
                    bundlePath: string;
                    artifact: any;
                  }) => {
                    const messageHandler = Registry.getMessageHandler(
                      bundlePath
                    );
                    if (messageHandler && artifact) {
                      this.displayEdgeAppImageBuildDetails(
                        messageHandler,
                        artifact,
                        targetInstance.connectionId
                      );
                    }
                  }
                );
              }
            })
            .catch((err) => {
              const getErrorMsg = (bundleFilePath: string): string => {
                let errorMsg: string;
                if (
                  err &&
                  err.message &&
                  err.message.startsWith('Failed to build an image')
                ) {
                  errorMsg = err.message;
                } else {
                  const instanceName = InstanceSelector.selectInstanceName(
                    store.getState(),
                    targetInstance.connectionId
                  );
                  errorMsg = `Failed to build an image for the application ${path.basename(
                    bundleFilePath
                  )} using the Streams instance ${instanceName}.`;
                }
                return errorMsg;
              };
              bundleFilePaths.forEach((bundleFilePath) => {
                const messageHandler = Registry.getMessageHandler(
                  bundleFilePath
                );
                if (messageHandler) {
                  this.handleError(
                    err,
                    messageHandler,
                    getErrorMsg(bundleFilePath)
                  );
                }
              });
            });
        }
      }
    };
    buildImage();
  }

  /**
   * Perform a toolkit build
   * @param folderOrFilePath the path to the folder, `toolkit.xml`, or `info.xml` file
   */
  public static async buildToolkit(folderOrFilePath: string): Promise<void> {
    await this.checkIfDirty();
    if (folderOrFilePath) {
      const { toolkitFolderPath, messageHandler } = this.initBuildToolkit(
        folderOrFilePath
      );
      if (!toolkitFolderPath || !messageHandler) {
        this._defaultMessageHandler.handleError(
          'The toolkit build failed. Unable to retrieve the toolkit folder path.'
        );
        return;
      }
      const zeroOrOneInstancesCallbackFn = this.getZeroOrOneInstancesCallbackFn(
        ActionType.BuildToolkit,
        (instance: any) => {
          this.runBuildToolkit(instance, toolkitFolderPath);
        },
        () => {
          this.buildToolkit(folderOrFilePath);
        }
      );
      const multipleInstancesCallbackFn = (): void => {
        this.showInstancePanel(
          ActionType.BuildToolkit,
          [toolkitFolderPath],
          null
        );
      };
      this.handleAction(
        ActionType.BuildToolkit,
        null,
        zeroOrOneInstancesCallbackFn,
        multipleInstancesCallbackFn
      );
    } else {
      this._defaultMessageHandler.handleError(
        'The toolkit build failed. Unable to retrieve the folder or file path.'
      );
    }
  }

  /**
   * Handle building a toolkit
   * @param targetInstance the target Streams instance
   * @param toolkitFolderPath the toolkit folder path
   */
  public static runBuildToolkit(
    targetInstance: any,
    toolkitFolderPath: string
  ): void {
    const buildToolkit = (): void => {
      if (targetInstance) {
        const startBuildToolkitAction = BuildToolkit.startBuildToolkit({
          folderPath: toolkitFolderPath,
          type: BuildType.Toolkit,
          targetInstance
        });
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(buildToolkit)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          const messageHandler = Registry.getMessageHandler(toolkitFolderPath);
          messageHandler.handleInfo(
            `Selected Streams instance: ${InstanceSelector.selectInstanceName(
              store.getState(),
              targetInstance.connectionId
            )}.`,
            { showNotification: false }
          );
          store.dispatch(startBuildToolkitAction).catch((err) => {
            let errorMsg: string;
            let learnMoreUrl = null;
            let buttons = null;
            if (
              err &&
              err.message &&
              err.message.startsWith('Failed to build a toolkit')
            ) {
              errorMsg = err.message;
              if (errorMsg.includes('CDISB5078E')) {
                errorMsg +=
                  ' The toolkit folder must contain a Makefile in order to build.';
                learnMoreUrl = `${DOC_BASE_URL}/docs/developing-toolkits/#building-a-toolkit`;
                buttons = [
                  {
                    label: 'Learn More',
                    callbackFn: (): void => {
                      Registry.openUrl(learnMoreUrl);
                    }
                  }
                ];
              }
            } else {
              const instanceName = InstanceSelector.selectInstanceName(
                store.getState(),
                targetInstance.connectionId
              );
              errorMsg = `Failed to build a toolkit using the Streams instance ${instanceName}.`;
            }
            this.handleError(err, messageHandler, errorMsg, buttons);
            if (learnMoreUrl) {
              messageHandler.handleError(`Learn more: ${learnMoreUrl}.`, {
                showNotification: false
              });
            }
          });
        }
      }
    };
    buildToolkit();
  }

  /**
   * Perform a primitive operator build
   * @param operatorType the primitive operator type
   * @param folderOrFilePath the path to the selected folder or file
   */
  public static async buildPrimitiveOperator(
    operatorType: PrimitiveOperatorType,
    folderOrFilePath: string
  ): Promise<void> {
    await this.checkIfDirty();
    if (folderOrFilePath) {
      const {
        primitiveOperatorFolderPath,
        messageHandler,
        error
      } = this.initBuildPrimitiveOperator(operatorType, folderOrFilePath);
      if (error) {
        this._defaultMessageHandler.handleError(
          `The ${operatorType} primitive operator build failed. ${error.errorMsg}`,
          { notificationButtons: error.buttons }
        );
        return;
      }
      if (!primitiveOperatorFolderPath || !messageHandler) {
        this._defaultMessageHandler.handleError(
          `The ${operatorType} primitive operator build failed. Unable to retrieve the ${operatorType} primitive operator folder path.`
        );
        return;
      }
      const zeroOrOneInstancesCallbackFn = this.getZeroOrOneInstancesCallbackFn(
        ActionType.BuildPrimitiveOperator,
        (instance: any) => {
          this.runBuildPrimitiveOperator(
            instance,
            operatorType,
            primitiveOperatorFolderPath
          );
        },
        () => {
          this.buildPrimitiveOperator(operatorType, folderOrFilePath);
        }
      );
      const multipleInstancesCallbackFn = (): void => {
        this.showInstancePanel(
          ActionType.BuildPrimitiveOperator,
          [primitiveOperatorFolderPath],
          null,
          { operatorType }
        );
      };
      this.handleAction(
        ActionType.BuildPrimitiveOperator,
        null,
        zeroOrOneInstancesCallbackFn,
        multipleInstancesCallbackFn
      );
    } else {
      this._defaultMessageHandler.handleError(
        `The ${operatorType} primitive operator build failed. Unable to retrieve the folder or file path.`
      );
    }
  }

  /**
   * Handle building a primitive operator
   * @param targetInstance the target Streams instance
   * @param operatorType the primitive operator type
   * @param primitiveOperatorFolderPath the primitive operator folder path
   */
  public static runBuildPrimitiveOperator(
    targetInstance: any,
    operatorType: PrimitiveOperatorType,
    primitiveOperatorFolderPath: string
  ): void {
    const buildPrimitiveOperator = (): void => {
      if (targetInstance) {
        const startBuildPrimitiveOperatorAction = BuildToolkit.startBuildToolkit(
          {
            folderPath: primitiveOperatorFolderPath,
            type: BuildType.PrimitiveOperator,
            buildPrimitiveOperatorArgs: { operatorType },
            targetInstance
          }
        );
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(buildPrimitiveOperator)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          const messageHandler = Registry.getMessageHandler(
            primitiveOperatorFolderPath
          );
          messageHandler.handleInfo(
            `Selected Streams instance: ${InstanceSelector.selectInstanceName(
              store.getState(),
              targetInstance.connectionId
            )}.`,
            { showNotification: false }
          );
          store.dispatch(startBuildPrimitiveOperatorAction).catch((err) => {
            let errorMsg: string;
            if (
              err &&
              err.message &&
              err.message.startsWith(
                `Failed to build a ${operatorType} primitive operator`
              )
            ) {
              errorMsg = err.message;
            } else {
              const instanceName = InstanceSelector.selectInstanceName(
                store.getState(),
                targetInstance.connectionId
              );
              errorMsg = `Failed to build a ${operatorType} primitive operator using the Streams instance ${instanceName}.`;
            }
            this.handleError(err, messageHandler, errorMsg);
          });
        }
      }
    };
    buildPrimitiveOperator();
  }

  /**
   * Make a C++ primitive operator
   * @param projectFolderPath the path to the project folder
   * @param operatorFolderPath the path to the operator folder
   * @param genericOperator whether or not should be a generic operator
   * @param resolve the promise resolve function
   */
  public static async makeCppPrimitiveOperator(
    projectFolderPath: string,
    operatorFolderPath: string,
    genericOperator: boolean,
    resolve: Function
  ): Promise<void> {
    await this.checkIfDirty();
    let messageHandler: MessageHandler;
    if (projectFolderPath && operatorFolderPath) {
      const result = this.initMakeCppPrimitiveOperator(
        projectFolderPath,
        genericOperator
      );
      messageHandler = result.messageHandler;
      if (result.error) {
        messageHandler.handleError(
          `The C++ primitive operator creation failed. ${result.error.errorMsg}`,
          { notificationButtons: result.error.buttons }
        );
        return;
      }
      const zeroOrOneInstancesCallbackFn = this.getZeroOrOneInstancesCallbackFn(
        ActionType.MakeCppPrimitiveOperator,
        (instance: any) => {
          this.runMakeCppPrimitiveOperator(
            instance,
            projectFolderPath,
            operatorFolderPath,
            genericOperator,
            resolve
          );
        },
        () => {
          this.makeCppPrimitiveOperator(
            projectFolderPath,
            operatorFolderPath,
            genericOperator,
            resolve
          );
        }
      );
      const multipleInstancesCallbackFn = (): void => {
        this.showInstancePanel(
          ActionType.MakeCppPrimitiveOperator,
          [projectFolderPath],
          null,
          { operatorFolderPath, genericOperator, resolve }
        );
      };
      this.handleAction(
        ActionType.MakeCppPrimitiveOperator,
        null,
        zeroOrOneInstancesCallbackFn,
        multipleInstancesCallbackFn
      );
    } else {
      messageHandler.handleError(
        'The C++ primitive operator creation failed. Unable to retrieve the folder or file path.'
      );
    }
  }

  /**
   * Handle making a C++ primitive operator
   * @param targetInstance the target Streams instance
   * @param projectFolderPath the path to the project folder
   * @param operatorFolderPath the path to the operator folder
   * @param genericOperator whether or not should be a generic operator
   * @param resolve the promise resolve function
   */
  public static runMakeCppPrimitiveOperator(
    targetInstance: any,
    projectFolderPath: string,
    operatorFolderPath: string,
    genericOperator: boolean,
    resolve: Function
  ): void {
    const makeCppPrimitiveOperator = (): void => {
      if (targetInstance) {
        const startMakeCppPrimitiveOperatorAction = BuildToolkit.startMakeCppPrimitiveOperator(
          {
            folderPath: projectFolderPath,
            type: BuildType.MakeCppPrimitiveOperator,
            makeCppPrimitiveOperatorArgs: {
              operatorFolderPath,
              genericOperator
            },
            targetInstance
          }
        );
        if (!Authentication.isAuthenticated(targetInstance)) {
          const queuedActionId = generateRandomId('queuedAction');
          store.dispatch(
            EditorAction.addQueuedAction({
              id: queuedActionId,
              action: Editor.executeCallbackFn(makeCppPrimitiveOperator)
            })
          );
          StreamsInstance.authenticate(targetInstance, false, queuedActionId);
        } else {
          const messageHandler = Registry.getMessageHandler(projectFolderPath);
          messageHandler.handleInfo(
            `Selected Streams instance: ${InstanceSelector.selectInstanceName(
              store.getState(),
              targetInstance.connectionId
            )}.`,
            { showNotification: false }
          );
          store
            .dispatch(startMakeCppPrimitiveOperatorAction)
            .then(() => resolve(true))
            .catch((err) => {
              let errorMsg: string;
              if (
                err &&
                err.message &&
                err.message.startsWith(
                  'Failed to create a C++ primitive operator'
                )
              ) {
                errorMsg = err.message;
              } else {
                const instanceName = InstanceSelector.selectInstanceName(
                  store.getState(),
                  targetInstance.connectionId
                );
                errorMsg = `Failed to create a C++ primitive operator using the Streams instance ${instanceName}.`;
              }
              this.handleError(err, messageHandler, errorMsg);
              resolve(false);
            });
        }
      }
    };
    return makeCppPrimitiveOperator();
  }

  /**
   * Get display path for builds
   * @param appRoot the application root path
   * @param filePath the path to the SPL file or Makefile
   * @param bundleFilePath the path to the application bundle file
   * @param folderPath the path to the folder
   */
  public static getDisplayPath(
    appRoot: string,
    filePath: string,
    bundleFilePath: string,
    folderPath: string
  ): string {
    if (appRoot && filePath) {
      return `${path.basename(appRoot)}${path.sep}${path.relative(
        appRoot,
        filePath
      )}`;
    }
    if (bundleFilePath) {
      const displayPath = this.getFilePathRelativeToWorkspaceFolder(
        bundleFilePath
      );
      return displayPath;
    }
    if (folderPath) {
      const displayPath = this.getFilePathRelativeToWorkspaceFolder(folderPath);
      return displayPath;
    }
    return null;
  }

  /**
   * List available toolkits
   */
  public static listToolkits(): void {
    const cachedToolkits = ToolkitUtils.getCachedToolkits(
      EditorSelector.selectToolkitsCacheDir(store.getState())
    ).map((tk: any) => tk.label);
    const cachedToolkitsStr = `\nBuild service toolkits:${
      cachedToolkits.length ? `\n  ${cachedToolkits.join('\n  ')}` : ' none'
    }`;

    const localToolkitPathsSetting = Configuration.getSetting(
      Settings.ENV_TOOLKIT_PATHS
    );
    let localToolkitsStr = '';
    if (localToolkitPathsSetting && localToolkitPathsSetting.length > 0) {
      const localToolkits = ToolkitUtils.getLocalToolkits(
        localToolkitPathsSetting
      ).map((tk: any) => tk.label);
      localToolkitsStr = `\n\nLocal toolkits from ${localToolkitPathsSetting}:${
        localToolkits.length ? `\n  ${localToolkits.join('\n  ')}` : ' none'
      }`;
    }
    window.showInformationMessage(
      'The available IBM Streams toolkits are displayed in the IBM Streams output channel.'
    );
    this._defaultMessageHandler.handleInfo('Streams toolkits:', {
      detail: `${cachedToolkitsStr}${localToolkitsStr}`,
      showNotification: false
    });
  }

  /**
   * Refresh toolkits
   */
  public static async refreshToolkits(): Promise<void> {
    const defaultInstance = Streams.checkDefaultInstance();
    if (!defaultInstance) {
      return;
    }

    const { instanceType } = defaultInstance;
    const isStreamsV5 =
      instanceType === StreamsInstanceType.V5_CPD ||
      instanceType === StreamsInstanceType.V5_STANDALONE;
    if (isStreamsV5) {
      if (!Authentication.isAuthenticated(defaultInstance)) {
        // Authenticating automatically refreshes the toolkits
        StreamsInstance.authenticate(null, true, null);
      } else {
        const toolkitPathsSetting = Configuration.getSetting(
          Settings.ENV_TOOLKIT_PATHS
        );
        if (
          typeof toolkitPathsSetting === 'string' &&
          toolkitPathsSetting.length > 0
        ) {
          if (toolkitPathsSetting.match(/[,;]/)) {
            const directories = toolkitPathsSetting.split(/[,;]/);
            const directoriesInvalid = _some(
              directories,
              (dir: string) =>
                dir !== Settings.ENV_TOOLKIT_PATHS_DEFAULT &&
                !fs.existsSync(dir)
            );
            if (directoriesInvalid) {
              this._defaultMessageHandler.handleError(
                'One or more toolkit paths do not exist or are not valid. Verify the paths.',
                {
                  detail: `Verify that the paths exist:\n${directories.join(
                    '\n'
                  )}`,
                  notificationButtons: [
                    {
                      label: 'Open Settings',
                      callbackFn: (): Promise<void> =>
                        this._defaultMessageHandler.openSettingsPage()
                    }
                  ]
                }
              );
              return;
            }
          } else if (
            toolkitPathsSetting !== Settings.ENV_TOOLKIT_PATHS_DEFAULT &&
            !fs.existsSync(toolkitPathsSetting)
          ) {
            this._defaultMessageHandler.handleError(
              `The specified toolkit path ${toolkitPathsSetting} does not exist or is not valid. Verify the path.`,
              {
                detail: `Verify that the path exists: ${toolkitPathsSetting}`,
                notificationButtons: [
                  {
                    label: 'Open Settings',
                    callbackFn: (): Promise<void> =>
                      this._defaultMessageHandler.openSettingsPage()
                  }
                ]
              }
            );
            return;
          }
        }

        await ToolkitUtils.refreshToolkits(defaultInstance.connectionId);
        getStreamsExplorer().refreshToolkitsView();
      }
    }
  }

  /**
   * Check if there are any dirty (unsaved) files
   */
  private static async checkIfDirty(): Promise<void> {
    const dirtyFiles = workspace.textDocuments.filter((file) => file.isDirty);
    if (dirtyFiles && dirtyFiles.length) {
      if (dirtyFiles.length === 1) {
        const [dirtyFile] = dirtyFiles;
        const dirtyFilePath = dirtyFile.uri.fsPath;
        const dirtyFileDisplayPath = this.getFilePathRelativeToWorkspaceFolder(
          dirtyFilePath
        );
        const selection = await window.showWarningMessage(
          `There are unsaved changes in ${dirtyFileDisplayPath}. Do you want to save the file before continuing with the build?`,
          ...['Yes', 'No']
        );
        if (selection && selection === 'Yes') {
          await dirtyFile.save();
        }
      } else {
        const selection = await window.showWarningMessage(
          'There are multiple files with unsaved changes. Do you want to save the files before continuing with the build?',
          ...['Save All', 'Choose Files to Save', 'Save None']
        );
        if (selection) {
          if (selection === 'Save All') {
            await Promise.all(dirtyFiles.map((dirtyFile) => dirtyFile.save()));
          } else if (selection === 'Choose Files to Save') {
            const items = dirtyFiles.map((dirtyFile) => {
              const dirtyFilePath = dirtyFile.uri.fsPath;
              const dirtyFileFolderPath = path.dirname(dirtyFile.uri.fsPath);
              const dirtyFileFolderDisplayPath = this.getFilePathRelativeToWorkspaceFolder(
                dirtyFileFolderPath
              );
              return {
                label: path.basename(dirtyFilePath),
                description: dirtyFileFolderDisplayPath,
                dirtyFile
              };
            });
            const selectedFiles = await window.showQuickPick(items, {
              canPickMany: true,
              ignoreFocusOut: true,
              matchOnDescription: true,
              placeHolder: 'Select the files to save'
            });
            if (selectedFiles && selectedFiles.length) {
              await Promise.all(
                selectedFiles.map((selectedFile) =>
                  selectedFile.dirtyFile.save()
                )
              );
            }
          }
          // Do nothing if 'Save None'
        }
      }
    }
  }

  /**
   * Get the file path relative to a workspace folder
   * @param filePath the path to the file
   */
  public static getFilePathRelativeToWorkspaceFolder(filePath: string): string {
    let newFilePath = filePath;
    const workspaceFolderPaths = workspace.workspaceFolders
      ? workspace.workspaceFolders.map(
          (folder: WorkspaceFolder) => folder.uri.fsPath
        )
      : [];
    if (workspaceFolderPaths && workspaceFolderPaths.length) {
      const matchingWorkspaceFolder = workspaceFolderPaths.find(
        (workspaceFolderPath) => filePath.startsWith(workspaceFolderPath)
      );
      if (matchingWorkspaceFolder) {
        newFilePath = path.relative(
          path.join(matchingWorkspaceFolder, '..'),
          filePath
        );
      }
    }
    return newFilePath;
  }

  /**
   * Initialize util registry
   */
  private static initUtilRegistry(): void {
    if (!Registry.getDefaultMessageHandler()) {
      this._defaultMessageHandler = new MessageHandler(null);
      Registry.setDefaultMessageHandler(this._defaultMessageHandler);
    }

    Registry.setSystemKeychain(Keychain);

    this._openUrlHandler = (
      url: string,
      callback?: () => void
    ): Thenable<void> =>
      env.openExternal(Uri.parse(url)).then(() => callback && callback());
    Registry.setOpenUrlHandler(this._openUrlHandler);

    this._sendLspNotificationHandler = (param: object): void =>
      SplLanguageClient.getClient().sendNotification(
        DidChangeConfigurationNotification.type.method,
        param
      );
    Registry.setSendLspNotificationHandler(this._sendLspNotificationHandler);

    const copyToClipboardHandler = (text: string): Thenable<void> =>
      VSCode.copyToClipboard(text);
    Registry.setCopyToClipboardHandler(copyToClipboardHandler);

    const executeCommandHandler = (
      name: EditorCommand,
      args: any[]
    ): Thenable<any> => {
      let commandName = null;
      if (name === EditorCommand.REFRESH_TOOLKITS) {
        commandName =
          Commands.VIEW.STREAMS_EXPLORER.STREAMS_TOOLKITS.REFRESH_TOOLKITS;
      } else if (name === EditorCommand.SET_TOOLKIT_PATHS_SETTING) {
        commandName = Commands.ENVIRONMENT.TOOLKIT_PATHS_SET;
      }
      return commandName
        ? commands.executeCommand(commandName, ...args)
        : Promise.reject();
    };
    Registry.setExecuteCommandHandler(executeCommandHandler);

    const showJobGraphHandler = (properties: object): Thenable<void> =>
      commands.executeCommand(Commands.ENVIRONMENT.SHOW_JOB_GRAPH, properties);
    Registry.setShowJobGraphHandler(showJobGraphHandler);

    const showJobSubmitDialogHandler = (opts: object): Thenable<void> =>
      commands.executeCommand(Commands.BUILD.CONFIGURE_JOB_SUBMISSION, opts);
    Registry.setShowJobSubmitHandler(showJobSubmitDialogHandler);

    const showImageBuildHandler = (opts: object): Thenable<void> =>
      commands.executeCommand(Commands.BUILD.CONFIGURE_IMAGE_BUILD, opts);
    Registry.setShowImageBuildHandler(showImageBuildHandler);
  }

  /**
   * Initialize Redux state
   */
  private static async initReduxState(): Promise<void> {
    store.dispatch(EditorAction.setIsActivated(true));
    store.dispatch(
      EditorAction.setOriginatingTool({
        tool: 'vscode',
        version: packageJson.version
      })
    );
    store.dispatch(EditorAction.setToolkitPathsSetting(this._toolkitPaths));
    store.dispatch(EditorAction.setToolkitsCacheDir(TOOLKITS_CACHE_DIR));
    store.dispatch(
      EditorAction.setRefreshInterval(
        Configuration.getSetting(Settings.ENV_REFRESH_INTERVAL)
      )
    );
    store.dispatch(
      EditorAction.setUpdateStreamsInstancesHandler(
        async (instances: any[]) => {
          const newInstances = instances.map((instance: any) =>
            _omit(instance, [
              'streamsInstance',
              'streamsJobGroups',
              'streamsJobs',
              'zenJobs'
            ])
          );
          await Streams.setInstances(newInstances);
          getStreamsExplorer().refreshInstancesView();
        }
      )
    );

    // Add stored instances
    const storedInstances = Streams.getInstances();
    if (isLoggingEnabled()) {
      // eslint-disable-next-line no-console
      console.log(
        'Stored Streams instances in extension state',
        storedInstances
      );
    }
    // Default instance not set, so set to the first one by default
    if (!Streams.getDefaultInstance() && storedInstances.length) {
      storedInstances[0].isDefault = true;
      await Streams.setInstances(storedInstances);
      Streams.setDefaultInstanceEnvContext();
      getStreamsExplorer().refreshInstancesView();
    }
    storedInstances.forEach((storedInstance: any) => {
      store
        .dispatch(
          Instance.addStreamsInstanceWithoutAuthentication(storedInstance)
        )
        .catch((error) => {
          this._defaultMessageHandler.handleError(
            'An error occurred while adding Streams instances to the Redux state.',
            { showNotification: false, detail: error }
          );
        });
    });
  }

  /**
   * Monitor changes to configuration settings
   */
  private static monitorConfigSettingChanges(): void {
    this._context.subscriptions.push(
      workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
        if (!event.affectsConfiguration(EXTENSION_ID)) {
          return;
        }

        if (event.affectsConfiguration(Settings.ENV_REFRESH_INTERVAL)) {
          const refreshSetting = Configuration.getSetting(
            Settings.ENV_REFRESH_INTERVAL
          );
          if (
            refreshSetting &&
            typeof refreshSetting === 'number' &&
            refreshSetting >= 1
          ) {
            store.dispatch(Editor.updateRefreshInterval(refreshSetting));
          }
        }

        if (event.affectsConfiguration(Settings.ENV_TIMEOUT_FOR_REQUESTS)) {
          const timeoutSetting = Configuration.getSetting(
            Settings.ENV_TIMEOUT_FOR_REQUESTS
          );
          if (
            timeoutSetting &&
            typeof timeoutSetting === 'number' &&
            timeoutSetting >= 1
          ) {
            StreamsRest.setRequestTimeout(timeoutSetting);
          }
        }

        if (event.affectsConfiguration(Settings.ENV_TOOLKIT_PATHS)) {
          const currentToolkitPathsSetting = Configuration.getSetting(
            Settings.ENV_TOOLKIT_PATHS
          );
          this._toolkitPaths =
            currentToolkitPathsSetting !== '' &&
            currentToolkitPathsSetting !== Settings.ENV_TOOLKIT_PATHS_DEFAULT
              ? currentToolkitPathsSetting
              : null;
          store.dispatch(
            EditorAction.setToolkitPathsSetting(this._toolkitPaths)
          );
          commands.executeCommand(
            Commands.VIEW.STREAMS_EXPLORER.STREAMS_TOOLKITS.REFRESH_TOOLKITS,
            false
          );
        }
      })
    );
  }

  /**
   * Monitor when the active editor is an SPL file and update toolkits cache
   */
  private static monitorOpenSplFile(): void {
    const checkToolkitsCache = (): void => {
      const storedInstances = Streams.getInstances();
      if (!storedInstances.length) {
        return;
      }

      // Check if toolkits cache directory is empty
      const isRefreshingToolkits = EditorSelector.selectIsRefreshingToolkits(
        store.getState()
      );
      const files = fs
        .readdirSync(TOOLKITS_CACHE_DIR)
        .filter(
          (file: any) =>
            typeof file === 'string' && path.extname(file) === '.xml'
        );
      const isEmpty = files.length === 0;
      if (!isRefreshingToolkits && isEmpty) {
        const message =
          'The available content assist and toolkits may not match what is available on the Streams build service.';
        if (!Streams.getDefaultInstanceEnv()) {
          window
            .showWarningMessage(
              `${message} A default Streams instance has not been set.`,
              'Set Default'
            )
            .then((selection: string) => {
              if (selection) {
                window
                  .showQuickPick(
                    Streams.getQuickPickItems(Streams.getInstances()),
                    {
                      canPickMany: false,
                      ignoreFocusOut: true,
                      placeHolder:
                        'Select a Streams instance to set as the default'
                    }
                  )
                  .then(
                    async (item: any): Promise<void> => {
                      if (item) {
                        StreamsInstance.setDefaultInstance(item);
                      }
                    }
                  );
              }
              return null;
            });
        } else {
          const defaultInstance = Streams.getDefaultInstance();
          const defaultIntanceName = InstanceSelector.selectInstanceName(
            store.getState(),
            defaultInstance.connectionId
          );
          const defaultInstanceType = Streams.getDefaultInstanceEnv();
          if (
            (defaultInstanceType === StreamsInstanceType.V5_CPD ||
              defaultInstanceType === StreamsInstanceType.V5_STANDALONE) &&
            !Authentication.isAuthenticated(defaultInstance)
          ) {
            window
              .showWarningMessage(
                `${message} Authenticate to the ${defaultIntanceName} instance to update the available toolkits.`,
                'Authenticate'
              )
              .then((selection: string) => {
                if (selection) {
                  StreamsInstance.authenticate(defaultInstance, false, null);
                }
              });
          }
        }
      }
    };

    // Check if current editor is an SPL file
    const { activeTextEditor } = window;
    if (
      activeTextEditor &&
      activeTextEditor.document.languageId === LANGUAGE_SPL
    ) {
      checkToolkitsCache();
    }
  }

  /**
   * Get zero or one instances callback function
   * @param action the post-build action to take
   * @param instanceExistsCallbackFn the callback function to execute if the instance exists
   * @param instanceDoesNotExistCallbackFn the callback function to execute if the instance does not exist
   */
  private static getZeroOrOneInstancesCallbackFn(
    action: PostBuildAction | ActionType,
    instanceExistsCallbackFn: Function,
    instanceDoesNotExistCallbackFn: Function
  ): Function {
    return (): void => {
      let instance = null;
      if (
        action === PostBuildAction.BuildImage ||
        action === ActionType.BuildImage
      ) {
        const instancesWithImageBuildEnabled = Streams.getInstancesWithImageBuildEnabled();
        if (
          instancesWithImageBuildEnabled &&
          instancesWithImageBuildEnabled.length
        ) {
          [instance] = instancesWithImageBuildEnabled;
        }
      } else if (
        action === ActionType.BuildToolkit ||
        action === ActionType.BuildPrimitiveOperator ||
        action === ActionType.MakeCppPrimitiveOperator
      ) {
        const instancesWithToolkitBuildSupport = Streams.getInstancesWithToolkitBuildSupport();
        if (
          instancesWithToolkitBuildSupport &&
          instancesWithToolkitBuildSupport.length
        ) {
          [instance] = instancesWithToolkitBuildSupport;
        }
      } else if (action === ActionType.UploadBundleCpd) {
        const instancesWithCpdSpacesSupport = Streams.getInstancesWithCpdSpacesSupport();
        if (
          instancesWithCpdSpacesSupport &&
          instancesWithCpdSpacesSupport.length
        ) {
          [instance] = instancesWithCpdSpacesSupport;
        }
      } else {
        instance = Streams.getDefaultInstance();
      }
      if (instance) {
        instanceExistsCallbackFn(instance);
      } else {
        instanceDoesNotExistCallbackFn();
      }
    };
  }

  /**
   * Handle build/submit action based on number of instances
   * @param action the action
   * @param postBuildAction the post-build action
   * @param zeroOrOneInstancesCallbackFn function to execute when there are no or one instances
   * @param multipleInstancesCallbackFn function to execute when there are multiple instances
   */
  private static handleAction(
    action: ActionType,
    postBuildAction: PostBuildAction,
    zeroOrOneInstancesCallbackFn: Function,
    multipleInstancesCallbackFn: Function
  ): void {
    const isPerformingImageBuild =
      action === ActionType.BuildImage ||
      postBuildAction === PostBuildAction.BuildImage;
    let storedInstances = [];
    if (isPerformingImageBuild) {
      storedInstances = Streams.getInstancesWithImageBuildEnabled();
    } else if (
      action === ActionType.BuildToolkit ||
      action === ActionType.BuildPrimitiveOperator ||
      action === ActionType.MakeCppPrimitiveOperator
    ) {
      storedInstances = Streams.getInstancesWithToolkitBuildSupport();
    } else if (action === ActionType.UploadBundleCpd) {
      storedInstances = Streams.getInstancesWithCpdSpacesSupport();
    } else {
      storedInstances = Streams.getInstances();
    }
    if (!storedInstances.length) {
      const notificationButtons = [
        {
          label: 'Add Instance',
          callbackFn: (): void => {
            const queuedActionId = generateRandomId('queuedAction');
            store.dispatch(
              EditorAction.addQueuedAction({
                id: queuedActionId,
                action: Editor.executeCallbackFn(zeroOrOneInstancesCallbackFn)
              })
            );
            StreamsInstance.authenticate(null, false, queuedActionId);
          }
        }
      ];
      let actionLabel = '';
      if (isPerformingImageBuild) {
        actionLabel = 'edge application image build(s)';
      } else if (action === ActionType.BuildToolkit) {
        actionLabel = 'toolkit build';
      } else if (action === ActionType.BuildPrimitiveOperator) {
        actionLabel = 'primitive operator build';
      } else if (action === ActionType.MakeCppPrimitiveOperator) {
        actionLabel = 'C++ primitive operator creation';
      } else if (
        action === ActionType.BuildApp ||
        action === ActionType.BuildMake
      ) {
        actionLabel = 'build';
      } else if (action === ActionType.Submit) {
        actionLabel = 'submission(s)';
      } else if (action === ActionType.UploadBundleCpd) {
        actionLabel = 'application bundle upload';
      }
      let message;
      if (isPerformingImageBuild) {
        message = `There are no Streams instances available that support edge application image builds. Add a supported instance to continue with the ${actionLabel}.`;
      } else if (
        action === ActionType.BuildToolkit ||
        action === ActionType.BuildPrimitiveOperator ||
        action === ActionType.MakeCppPrimitiveOperator
      ) {
        message = `There are no Streams instances available that support ${actionLabel}s. Add a supported instance (IBM Streams 5.5 or greater) to continue with the ${actionLabel}.`;
      } else if (action === ActionType.UploadBundleCpd) {
        message = `There are no Streams instances available that support ${actionLabel}s. Add a supported instance (IBM Cloud Pak for Data 3.5 or greater; IBM Streams 5.5 or greater) to continue with the ${actionLabel}.`;
      } else {
        message = `There are no Streams instances available. Add an instance to continue with the ${actionLabel}.`;
      }
      this._defaultMessageHandler.handleInfo(message, { notificationButtons });
    } else if (storedInstances.length === 1) {
      zeroOrOneInstancesCallbackFn();
    } else {
      multipleInstancesCallbackFn();
    }
  }

  /**
   * Show instance selection webview panel
   * @param action the build and/or submit action
   * @param filePaths the selected file paths
   * @param postBuildAction the post-build action
   * @param postBuildAction the post-selection args
   */
  private static showInstancePanel(
    action: string,
    filePaths: string[],
    postBuildAction: any,
    args?: any
  ): void {
    commands.executeCommand(
      Commands.ENVIRONMENT.SHOW_INSTANCE_WEBVIEW_PANEL,
      action,
      filePaths,
      postBuildAction,
      args
    );
  }

  /**
   * Initialize a Streams build
   * @param type the build type (from SPL file or Makefile)
   * @param filePath the path to the SPL file or Makefile
   * @param action the post-build action to take
   */
  private static async initBuild(
    type: string,
    filePath: string,
    action: PostBuildAction
  ): Promise<any> {
    const workspaceFolders = workspace.workspaceFolders
      ? _map(
          workspace.workspaceFolders,
          (folder: WorkspaceFolder) => folder.uri.fsPath
        )
      : [];
    const appRoot = SourceArchiveUtils.getApplicationRoot(
      workspaceFolders,
      filePath,
      true
    );

    let lintHandler = Registry.getLintHandler(appRoot);
    if (!lintHandler) {
      lintHandler = new LintHandler(appRoot);
      Registry.addLintHandler(appRoot, lintHandler);
    }

    let compositeToBuild: string;
    let messageHandlerId: string;
    if (type === 'buildApp') {
      const {
        namespace,
        mainComposites
      }: any = StreamsUtils.getFqnMainComposites(filePath);
      compositeToBuild = await this.getCompositeToBuild(
        namespace,
        mainComposites
      );
      messageHandlerId = `${appRoot}:${compositeToBuild}`;
    } else {
      messageHandlerId = filePath;
    }

    let messageHandler = Registry.getMessageHandler(messageHandlerId);
    if (!messageHandler) {
      messageHandler = new MessageHandler({ appRoot, filePath });
      Registry.addMessageHandler(messageHandlerId, messageHandler);
    }

    const displayPath = this.getDisplayPath(appRoot, filePath, null, null);
    Logger.registerOutputChannel(filePath, displayPath);

    let statusMessage: string;
    if (type === 'buildApp') {
      statusMessage = `Received request to build${
        action === PostBuildAction.Submit ? ' and submit.' : '.'
      }`;
    } else {
      statusMessage = `Received request to build from a Makefile${
        action === PostBuildAction.Submit ? ' and submit.' : '.'
      }`;
    }
    messageHandler.handleInfo(statusMessage, { showNotification: false });
    messageHandler.handleInfo(`Selected: ${filePath}`, {
      showNotification: false
    });

    if (type === 'buildApp') {
      return { appRoot, compositeToBuild, messageHandler };
    }
    return { appRoot, messageHandler };
  }

  /**
   * Initialize a Streams job submission
   * @param filePaths the paths to the application bundle(s)
   */
  private static initSubmit(filePaths: string[]): string[] {
    const bundleFilePaths = filePaths.filter((filePath: string) =>
      filePath.toLowerCase().endsWith('.sab')
    );

    bundleFilePaths.forEach((bundleFilePath) => {
      const messageHandlerId = bundleFilePath;
      let messageHandler = Registry.getMessageHandler(messageHandlerId);
      if (!messageHandler) {
        messageHandler = new MessageHandler({ bundleFilePath });
        Registry.addMessageHandler(messageHandlerId, messageHandler);
      }

      const displayPath = this.getDisplayPath(null, null, bundleFilePath, null);
      Logger.registerOutputChannel(bundleFilePath, displayPath);

      const statusMessage = 'Received request to submit an application bundle.';
      messageHandler.handleInfo(statusMessage, { showNotification: false });
      messageHandler.handleInfo(`Selected: ${bundleFilePath}`, {
        showNotification: false
      });
    });

    return bundleFilePaths;
  }

  /**
   * Initialize a Streams edge application image build
   * @param filePaths the paths to the application bundle(s)
   */
  private static initBuildImage(filePaths: string[]): string[] {
    const bundleFilePaths = filePaths.filter((filePath: string) =>
      filePath.toLowerCase().endsWith('.sab')
    );

    bundleFilePaths.forEach((bundleFilePath) => {
      const messageHandlerId = bundleFilePath;
      let messageHandler = Registry.getMessageHandler(messageHandlerId);
      if (!messageHandler) {
        messageHandler = new MessageHandler({ bundleFilePath });
        Registry.addMessageHandler(messageHandlerId, messageHandler);
      }

      const displayPath = this.getDisplayPath(null, null, bundleFilePath, null);
      Logger.registerOutputChannel(bundleFilePath, displayPath);

      const statusMessage =
        'Received request to build an edge application image using an application bundle.';
      messageHandler.handleInfo(statusMessage, { showNotification: false });
      messageHandler.handleInfo(`Selected: ${bundleFilePath}`, {
        showNotification: false
      });
    });

    return bundleFilePaths;
  }

  /**
   * Initialize a Streams toolkit build
   * @param folderOrFilePath the path to the folder, `toolkit.xml`, or `info.xml` file
   */
  private static initBuildToolkit(folderOrFilePath: string): any {
    try {
      const toolkitFolderPath = fs.lstatSync(folderOrFilePath).isDirectory()
        ? folderOrFilePath
        : path.dirname(folderOrFilePath);

      let messageHandler = Registry.getMessageHandler(toolkitFolderPath);
      if (!messageHandler) {
        messageHandler = new MessageHandler({ toolkitFolderPath });
        Registry.addMessageHandler(toolkitFolderPath, messageHandler);
      }

      const displayPath = this.getDisplayPath(
        null,
        null,
        null,
        toolkitFolderPath
      );
      Logger.registerOutputChannel(toolkitFolderPath, displayPath);

      const statusMessage = 'Received request to build a toolkit.';
      messageHandler.handleInfo(statusMessage, { showNotification: false });
      messageHandler.handleInfo(`Toolkit folder: ${toolkitFolderPath}`, {
        showNotification: false
      });

      return { toolkitFolderPath, messageHandler };
    } catch (err) {
      return null;
    }
  }

  /**
   * Initialize a primitive operator build
   * @param operatorType the primitive operator type
   * @param folderOrFilePath the path to the selected folder file
   */
  private static initBuildPrimitiveOperator(
    operatorType: PrimitiveOperatorType,
    folderOrFilePath: string
  ): any {
    try {
      const learnMoreUrl =
        operatorType === PrimitiveOperatorType.Cpp
          ? `${DOC_BASE_URL}/docs/developing-cpp-primitive-operators/#building-a-c-primitive-operator`
          : `${DOC_BASE_URL}/docs/developing-java-primitive-operators/#building-a-java-primitive-operator`;
      const errorObj = {
        error: {
          errorMsg:
            'The project folder structure for the operator is not valid.',
          buttons: [
            {
              label: 'Learn More',
              callbackFn: (): void => {
                Registry.openUrl(learnMoreUrl);
              }
            }
          ]
        }
      };

      // Check if folder structure is valid. If so, get the project folder path.
      const {
        error,
        primitiveOperatorFolderPath
      } = this.isValidPrimitiveOperatorFolderStructure(
        operatorType,
        folderOrFilePath
      );
      if (error) {
        return errorObj;
      }

      let messageHandler = Registry.getMessageHandler(
        primitiveOperatorFolderPath
      );
      if (!messageHandler) {
        messageHandler = new MessageHandler({ primitiveOperatorFolderPath });
        Registry.addMessageHandler(primitiveOperatorFolderPath, messageHandler);
      }

      const displayPath = this.getDisplayPath(
        null,
        null,
        null,
        primitiveOperatorFolderPath
      );
      Logger.registerOutputChannel(primitiveOperatorFolderPath, displayPath);

      const statusMessage = `Received request to build a ${operatorType} primitive operator.`;
      messageHandler.handleInfo(statusMessage, { showNotification: false });
      messageHandler.handleInfo(
        `${operatorType} primitive operator project folder: ${primitiveOperatorFolderPath}`,
        { showNotification: false }
      );

      return { primitiveOperatorFolderPath, messageHandler };
    } catch (err) {
      return null;
    }
  }

  /**
   * Initialize a C++ primitive operator creation
   * @param folderPath the path to the folder
   * @param genericOperator whether or not should be a generic operator
   */
  private static initMakeCppPrimitiveOperator(
    folderPath: string,
    genericOperator: boolean
  ): any {
    try {
      let messageHandler = Registry.getMessageHandler(folderPath);
      if (!messageHandler) {
        messageHandler = new MessageHandler({
          primitiveOperatorFolderPath: folderPath
        });
        Registry.addMessageHandler(folderPath, messageHandler);
      }

      const displayPath = this.getDisplayPath(null, null, null, folderPath);
      Logger.registerOutputChannel(folderPath, displayPath);

      const statusMessage =
        'Received request to create a C++ primitive operator.';
      messageHandler.handleInfo(statusMessage, { showNotification: false });
      messageHandler.handleInfo(
        `C++ primitive operator project folder: ${folderPath}\nGeneric operator: ${genericOperator.toString()}`,
        { showNotification: false }
      );

      return { messageHandler };
    } catch (err) {
      return null;
    }
  }

  /**
   * Check if a folder is a valid primitive operator project folder
   * @param operatorType the primitive operator type
   * @param folderOrFilePath the path to the selected folder file
   */
  private static isValidPrimitiveOperatorFolderStructure(
    operatorType: PrimitiveOperatorType,
    folderOrFilePath: string
  ): any {
    const isDirectory = fs.lstatSync(folderOrFilePath).isDirectory();
    const errorObj = { error: true };
    const isMakefile = path.basename(folderOrFilePath) === 'Makefile';
    if (operatorType === PrimitiveOperatorType.Cpp) {
      // Expected folder structure:
      // /+ <project-folder>
      //    /+ <operator-namespace>
      //       /+ <operator-name>
      //          /+ <operator-name>.xml
      //          /+ <operator-name>_cpp.cgt
      //          /+ <operator-name>_cpp.pm
      //          /+ <operator-name>_h.cgt
      //          /+ <operator-name>_h.pm
      //    /+ Makefile
      if (isDirectory) {
        // User triggered build from a folder

        // Check Makefile file
        if (!fs.existsSync(path.join(folderOrFilePath, 'Makefile'))) {
          return errorObj;
        }

        // Check for .cgt, .pm, and .xml files
        const cgtFilePaths = glob.sync(
          path.join(folderOrFilePath, '*', '*', '*.cgt')
        );
        const pmFilePaths = glob.sync(
          path.join(folderOrFilePath, '*', '*', '*.pm')
        );
        const xmlFilePaths = glob.sync(
          path.join(folderOrFilePath, '*', '*', '*.xml')
        );
        if (
          !cgtFilePaths ||
          !cgtFilePaths.length ||
          !pmFilePaths ||
          !pmFilePaths.length ||
          !xmlFilePaths ||
          !xmlFilePaths.length
        ) {
          return errorObj;
        }

        return { error: false, primitiveOperatorFolderPath: folderOrFilePath };
      } else if (isMakefile) {
        const parentFolderPath = path.dirname(folderOrFilePath);
        const cgtFilePaths = glob.sync(
          path.join(parentFolderPath, '*', '*', '*.cgt')
        );
        const pmFilePaths = glob.sync(
          path.join(parentFolderPath, '*', '*', '*.pm')
        );
        const xmlFilePaths = glob.sync(
          path.join(parentFolderPath, '*', '*', '*.xml')
        );
        if (
          !cgtFilePaths ||
          !cgtFilePaths.length ||
          !pmFilePaths ||
          !pmFilePaths.length ||
          !xmlFilePaths ||
          !xmlFilePaths.length
        ) {
          return errorObj;
        }

        return { error: false, primitiveOperatorFolderPath: parentFolderPath };
      } else {
        // User triggered build from a .cgt, .pm, or .xml file

        // Check for .cgt, .pm, and .xml files
        const parentFolderPath = path.dirname(folderOrFilePath);
        const cgtFilePaths = glob.sync(path.join(parentFolderPath, '*.cgt'));
        const pmFilePaths = glob.sync(path.join(parentFolderPath, '*.pm'));
        const xmlFilePaths = glob.sync(path.join(parentFolderPath, '*.xml'));
        if (
          !cgtFilePaths ||
          !cgtFilePaths.length ||
          !pmFilePaths ||
          !pmFilePaths.length ||
          !xmlFilePaths ||
          !xmlFilePaths.length
        ) {
          return errorObj;
        }

        // Check Makefile file
        const makefileFilePath = path.resolve(
          folderOrFilePath,
          '..',
          '..',
          '..',
          'Makefile'
        );
        if (!fs.existsSync(makefileFilePath)) {
          return errorObj;
        }

        return {
          error: false,
          primitiveOperatorFolderPath: path.resolve(
            folderOrFilePath,
            '..',
            '..',
            '..'
          )
        };
      }
    } else {
      // Expected folder structure:
      // /+ <project-folder>
      //    /+ impl
      //       /+ java
      //          /+ bin
      //          /+ src
      //             /+ <operator-namespace>
      //                /+ <operator-name>.java
      //    /+ Makefile
      let expectedPaths: string[];
      if (isDirectory) {
        // User triggered build from a folder

        // Check for expected files and folders
        expectedPaths = [
          path.join(folderOrFilePath, 'Makefile'),
          path.join(folderOrFilePath, 'impl'),
          path.join(folderOrFilePath, 'impl', 'java'),
          path.join(folderOrFilePath, 'impl', 'java', 'bin'),
          path.join(folderOrFilePath, 'impl', 'java', 'src')
        ];
        if (
          expectedPaths.some(
            (expectedPath: string) => !fs.existsSync(expectedPath)
          )
        ) {
          return errorObj;
        }

        // Check .java file(s)
        const javaFilePaths = glob.sync(
          path.join(folderOrFilePath, 'impl', 'java', 'src', '**', '*.java')
        );
        if (!javaFilePaths || !javaFilePaths.length) {
          return errorObj;
        }

        return { error: false, primitiveOperatorFolderPath: folderOrFilePath };
      } else if (isMakefile) {
        const parentFolderPath = path.dirname(folderOrFilePath);
        expectedPaths = [
          path.join(parentFolderPath, 'impl'),
          path.join(parentFolderPath, 'impl', 'java'),
          path.join(parentFolderPath, 'impl', 'java', 'bin'),
          path.join(parentFolderPath, 'impl', 'java', 'src')
        ];
        if (
          expectedPaths.some(
            (expectedPath: string) => !fs.existsSync(expectedPath)
          )
        ) {
          return errorObj;
        }

        return { error: false, primitiveOperatorFolderPath: parentFolderPath };
      } else {
        // User triggered build from a .java file

        // Check for expected files and folders
        const filePathTokens = folderOrFilePath.split(path.sep);
        const srcIndex = filePathTokens.lastIndexOf('src');
        filePathTokens.splice(srcIndex + 1);
        const srcFolderPath = filePathTokens.join(path.sep);
        const binFolderPath = path.resolve(srcFolderPath, '..', 'bin');
        expectedPaths = [srcFolderPath, binFolderPath];
        if (
          expectedPaths.some(
            (expectedPath: string) => !fs.existsSync(expectedPath)
          )
        ) {
          return errorObj;
        }

        // Check java folder
        const javaFolderPath = path.dirname(binFolderPath);
        if (path.basename(javaFolderPath) !== 'java') {
          return errorObj;
        }

        // Check impl folder
        const implFolderPath = path.dirname(javaFolderPath);
        if (path.basename(implFolderPath) !== 'impl') {
          return errorObj;
        }

        // Check Makefile file
        const makefileFilePath = path.resolve(implFolderPath, '..', 'Makefile');
        if (!fs.existsSync(makefileFilePath)) {
          return errorObj;
        }

        return {
          error: false,
          primitiveOperatorFolderPath: path.dirname(implFolderPath)
        };
      }
    }
  }

  /**
   * Get the main composite to build. Prompt the user to select if
   * there are multiple composites defined and there is no Makefile.
   * @param namespace the defined namespace
   * @param composites the defined composites
   */
  private static async getCompositeToBuild(
    namespace: string,
    composites: string[]
  ): Promise<string> {
    if (composites.length === 1) {
      return namespace === ''
        ? composites[0]
        : `${namespace}::${composites[0]}`;
    }

    return window
      .showQuickPick(composites, {
        ignoreFocusOut: true,
        placeHolder: 'Select the main composite to build...'
      })
      .then((composite: string) => {
        if (composite) {
          return namespace === '' ? composite : `${namespace}::${composite}`;
        }
        throw new Error('Build canceled, a main composite was not selected');
      });
  }

  /**
   * Display edge application image build details in the output channel
   * @param messageHandler the message handler
   * @param jsonDetails the image details in JSON format
   * @param connectionId the target Streams instance connection identifier
   */
  private static displayEdgeAppImageBuildDetails(
    messageHandler: MessageHandler,
    jsonDetails: any,
    connectionId: string
  ): void {
    const stringDetails = JSON.stringify(jsonDetails, null, 2);
    const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
      store.getState(),
      connectionId
    );
    const cpdPackageUrl = `${cpdUrl}/edge/index.html#/edgeAnalytics/analyticsApplicationPackages/add`;
    const eamPackageUrl =
      'https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/svc-edge/usage-register-app.html';
    const packageDocUrl =
      'https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/svc-edge/usage-register-app.html#usage-register-app';
    const nextSteps =
      'Before you can deploy this edge application, you must either package it as:\n\n' +
      '- An edge application package for IBM Cloud Pak for Data:\n' +
      `  Create a package with an image reference of ${jsonDetails.imageName}:${jsonDetails.imageTag} here: ${cpdPackageUrl}.\n` +
      '- A service for IBM Edge Application Manager:\n' +
      `  Create a service by following the instructions here: ${eamPackageUrl}.\n\n` +
      `For more information, refer to the documentation: ${packageDocUrl}.`;
    messageHandler.handleInfo('Image details:', {
      detail: `${stringDetails}\n\n${nextSteps}`,
      showNotification: false
    });
  }

  /**
   * Handle an error
   * @param err the error object
   * @param messageHandler the message handler
   * @param errorMsg the error message
   * @param buttons the notification buttons
   */
  private static handleError(
    err: any,
    messageHandler: MessageHandler,
    errorMsg: string,
    buttons?: any[]
  ): void {
    let notificationButtons = buttons || [];
    notificationButtons = [
      {
        label: 'View Output',
        callbackFn: (): void => {
          messageHandler.showOutput();
        }
      },
      ...notificationButtons
    ];
    messageHandler.handleError(errorMsg, {
      ...(notificationButtons && {
        notificationButtons,
        isButtonSelectionRequired: false
      }),
      detail: err.response || errorMsg || err.message || err,
      stack: err.response || err.stack
    });
  }
}
