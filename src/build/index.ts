import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import { URL } from 'url';
import { commands, ConfigurationChangeEvent, ExtensionContext, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';
import * as packageJson from '../../package.json';
import { Commands } from '../commands';
import { SplLanguageClient } from '../languageClient';
import { Constants, Keychain, Settings, SplConfig, SplLogger } from '../utils';
import LintHandlerRegistry from './lint-handler-registry';
import LintHandler from './LintHandler';
import MessageHandlerRegistry from './message-handler-registry';
import MessageHandler from './MessageHandler';
import { SplBuilder } from './v4/spl-build-common';
import {
  executeCallbackFn,
  newBuild,
  queueAction,
  resetAuth,
  setBuildOriginator,
  setFormDataField,
  setIcp4dUrl,
  setRememberPassword,
  setToolkitsCacheDir,
  setToolkitsPathSetting,
  setUseIcp4dMasterNodeHost,
  setUsername,
  submitApplicationsFromBundleFiles
} from './v5/actions';
import getStore from './v5/redux-store/configure-store';
import SourceArchiveUtils from './v5/util/source-archive-utils';
import StateSelector from './v5/util/state-selectors';
import StreamsToolkitsUtils from './v5/util/streams-toolkits-utils';
import StreamsUtils from './v5/util/streams-utils';

export function initialize() {
    const username = SplConfig.getState(`${Constants.EXTENSION_NAME}.username`);
    const rememberPassword = SplConfig.getState(`${Constants.EXTENSION_NAME}.rememberPassword`);
    if (username) {
        getStore().dispatch(setUsername(username));
    }
    if (rememberPassword) {
        getStore().dispatch(setRememberPassword(rememberPassword));
    }
}

export class SplBuild {
    private static _context: ExtensionContext;
    private static _streamingAnalyticsCredentials: string;
    private static _toolkitsPath: string;
    private static _apiVersion: string;
    private static _originator: object;
    private static _openUrlHandler: (url: string, callback?: () => void) => void;
    private static _sendLspNotificationHandler: (param: object) => void;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this._context = context;

        const credentialsSetting = SplConfig.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS);
        this._streamingAnalyticsCredentials = credentialsSetting ? JSON.stringify(credentialsSetting) : null;

        const toolkitsPathSetting = SplConfig.getSetting(Settings.TOOLKITS_PATH);
        this._toolkitsPath = toolkitsPathSetting !== '' ? toolkitsPathSetting : null;
        getStore().dispatch(setToolkitsPathSetting(this._toolkitsPath));

        if (!StateSelector.getIcp4dUrl(getStore().getState())) {
            this.updateIcp4dUrl(SplConfig.getSetting(Settings.ICP4D_URL));
        }

        if (!StateSelector.getUseIcp4dMasterNodeHost(getStore().getState())) {
            getStore().dispatch(setUseIcp4dMasterNodeHost(SplConfig.getSetting(Settings.USE_ICP4D_MASTER_NODE_HOST)));
        }

        this._apiVersion = SplConfig.getSetting(Settings.TARGET_VERSION);

        this._originator = { originator: 'vscode', version: packageJson.version, type: 'spl' };

        if (!MessageHandlerRegistry.getDefault()) {
            MessageHandlerRegistry.setDefault(new MessageHandler(null));
        }

        this._openUrlHandler = (url: string, callback?: () => void): Thenable<void> => commands.executeCommand('vscode.open', Uri.parse(url)).then(() => callback && callback());
        MessageHandlerRegistry.setOpenUrlHandler(this._openUrlHandler);

        this._sendLspNotificationHandler = (param: object) => SplLanguageClient.getClient().sendNotification(DidChangeConfigurationNotification.type, param);
        MessageHandlerRegistry.setSendLspNotificationHandler(this._sendLspNotificationHandler);

        if (!fs.existsSync(Constants.TOOLKITS_CACHE_DIR)) {
            fs.mkdirSync(Constants.TOOLKITS_CACHE_DIR);
        }
        getStore().dispatch(setToolkitsCacheDir(Constants.TOOLKITS_CACHE_DIR));

        getStore().dispatch(setBuildOriginator('vscode', packageJson.version));

        // Monitor changes to configuration settings
        this._context.subscriptions.push(workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
            if (!event.affectsConfiguration(Constants.EXTENSION_NAME)) {
                return;
            }

            if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.ICP4D_URL}`)) {
                this.updateIcp4dUrl(SplConfig.getSetting(Settings.ICP4D_URL));
                getStore().dispatch(resetAuth());
            }

            if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.STREAMING_ANALYTICS_CREDENTIALS}`)) {
                const currentCredentialsSetting = SplConfig.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS);
                this._streamingAnalyticsCredentials = currentCredentialsSetting ? JSON.stringify(currentCredentialsSetting) : null;
            }

            if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.TARGET_VERSION}`)) {
                this._apiVersion = SplConfig.getSetting(Settings.TARGET_VERSION);
            }

            if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.TOOLKITS_PATH}`)) {
                const currentToolkitsPathSetting = SplConfig.getSetting(Settings.TOOLKITS_PATH);
                this._toolkitsPath = currentToolkitsPathSetting !== '' ? currentToolkitsPathSetting : null;
                getStore().dispatch(setToolkitsPathSetting(this._toolkitsPath));

                // Send added and removed toolkits to the LSP server
                const previousToolkitsPathSetting = SplConfig.getState(`${Constants.EXTENSION_NAME}.${Settings.TOOLKITS_PATH}`);
                const { addedToolkitPaths, removedToolkitNames } = StreamsToolkitsUtils.getChangedLocalToolkits(previousToolkitsPathSetting, currentToolkitsPathSetting);
                if (addedToolkitPaths && addedToolkitPaths.length) {
                    const addParam = StreamsToolkitsUtils.getLangServerParamForAddToolkits(addedToolkitPaths);
                    SplLanguageClient.getClient().sendNotification(DidChangeConfigurationNotification.type, addParam);
                }
                if (removedToolkitNames && removedToolkitNames.length) {
                    const removeParam = StreamsToolkitsUtils.getLangServerParamForRemoveToolkits(removedToolkitNames);
                    SplLanguageClient.getClient().sendNotification(DidChangeConfigurationNotification.type, removeParam);
                }
            }

            if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.USE_ICP4D_MASTER_NODE_HOST}`)) {
                const useHostSetting = SplConfig.getSetting(Settings.USE_ICP4D_MASTER_NODE_HOST);
                getStore().dispatch(setUseIcp4dMasterNodeHost(useHostSetting));
            }
        }));

        getStore().dispatch({ type: 'PACKAGE_ACTIVATED' });
    }

    /**
     * Perform a build of an SPL file and either download the bundle or submit the application
     * @param filePath    The path to the SPL file
     * @param action      The build action to take
     */
    public static async buildApp(filePath: string, action: number): Promise<void> {
        if (filePath) {
            const workspaceFolders = _.map(workspace.workspaceFolders, (folder: WorkspaceFolder) => folder.uri.fsPath);
            const appRoot = SourceArchiveUtils.getApplicationRoot(workspaceFolders, filePath);
            const { namespace, mainComposites }: any = StreamsUtils.getFqnMainComposites(filePath);
            const compositeToBuild = await this.getCompositeToBuild(appRoot, namespace, mainComposites);

            let lintHandler = LintHandlerRegistry.get(appRoot);
            if (!lintHandler) {
                lintHandler = new LintHandler(appRoot);
                LintHandlerRegistry.add(appRoot, lintHandler);
            }

            let messageHandler = MessageHandlerRegistry.get(compositeToBuild);
            if (!messageHandler) {
                messageHandler = new MessageHandler({ appRoot, filePath });
                MessageHandlerRegistry.add(compositeToBuild, messageHandler);
            }

            const displayPath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePath)}`;
            const outputChannel = SplLogger.registerOutputChannel(filePath, displayPath);

            const statusMessage = `Received request to build${action === SplBuilder.BUILD_ACTION.SUBMIT ? ' and submit' : ''}`;
            SplLogger.info(outputChannel, statusMessage, false, true);
            SplLogger.debug(outputChannel, `Selected: ${filePath}`);

            if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
                const handleBuildAppV5 = () => this.buildAppV5(appRoot, compositeToBuild, action);
                if (StateSelector.getIcp4dUrl(getStore().getState())) {
                    handleBuildAppV5();
                } else {
                    this.handleIcp4dUrlNotSet(handleBuildAppV5);
                }
            } else {
                this.buildAppV4(appRoot, compositeToBuild, action, messageHandler);
            }
        } else {
            throw new Error('Unable to retrieve file path');
        }
    }

    /**
     * Handle a build of an SPL file to Streams V4
     * @param appRoot             The application root path
     * @param compositeToBuild    The composite to build
     * @param action              The build action to take
     * @param messageHandler      The message handler object
     */
    public static async buildAppV4(appRoot: string, compositeToBuild: string, action: number, messageHandler: MessageHandler): Promise<void> {
        try {
            return SourceArchiveUtils.buildSourceArchive({
                appRoot,
                buildId: null,
                bundleToolkits: false,
                fqn: compositeToBuild,
                makefilePath: null,
                toolkitRootPath: this._toolkitsPath
            }).then((result: any) => {
                if (result.archivePath) {
                    const lintHandler = new LintHandler(appRoot);
                    const builder = new SplBuilder(messageHandler, lintHandler, this._openUrlHandler, this._originator, { appRoot, fqn: compositeToBuild });
                    builder.build(action, this._streamingAnalyticsCredentials, { filename: result.archivePath });
                }
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Handle a build of an SPL file to Streams V5
     * @param appRoot             The application root path
     * @param compositeToBuild    The composite to build
     * @param action              The build action to take
     */
    public static async buildAppV5(appRoot: string, compositeToBuild: string, action: number): Promise<void> {
        const newBuildAction = newBuild({
            appRoot,
            fqn: compositeToBuild,
            makefilePath: null,
            postBuildAction: action,
            toolkitRootPath: this._toolkitsPath
        });

        if (!StateSelector.hasAuthenticatedToStreamsInstance(getStore().getState())) {
            getStore().dispatch(queueAction(newBuildAction));
            this.showIcp4dAuthPanel();
        } else {
            getStore().dispatch(newBuildAction);
        }
    }

    /**
     * Perform a build from a Makefile and either download the bundle(s) or submit the application(s)
     * @param filePath    The path to the Makefile
     * @param action      The build action to take
     */
    public static async buildMake(filePath: string, action: number): Promise<void> {
        if (filePath) {
            const workspaceFolders = _.map(workspace.workspaceFolders, (folder: WorkspaceFolder) => folder.uri.fsPath);
            const appRoot = SplBuilder.getApplicationRoot(workspaceFolders, filePath);

            let lintHandler = LintHandlerRegistry.get(appRoot);
            if (!lintHandler) {
                lintHandler = new LintHandler(appRoot);
                LintHandlerRegistry.add(appRoot, lintHandler);
            }

            let messageHandler = MessageHandlerRegistry.get(filePath);
            if (!messageHandler) {
                messageHandler = new MessageHandler({ appRoot, filePath });
                MessageHandlerRegistry.add(filePath, messageHandler);
            }

            const displayPath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePath)}`;
            const outputChannel = SplLogger.registerOutputChannel(filePath, displayPath);

            const statusMessage = `Received request to build from a Makefile${action === SplBuilder.BUILD_ACTION.SUBMIT ? ' and submit' : ''}`;
            SplLogger.info(outputChannel, statusMessage, false, true);
            SplLogger.debug(outputChannel, `Selected: ${filePath}`);

            if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
                const handleBuildMakeV5 = () => this.buildMakeV5(appRoot, filePath, action);
                if (StateSelector.getIcp4dUrl(getStore().getState())) {
                    handleBuildMakeV5();
                  } else {
                    this.handleIcp4dUrlNotSet(handleBuildMakeV5);
                  }
            } else {
                this.buildMakeV4(appRoot, filePath, action, messageHandler);
            }
        } else {
            throw new Error('Unable to retrieve file path');
        }
    }

    /**
     * Handle a build of a Makefile to Streams V4
     * @param appRoot           The application root path
     * @param filePath          The path to the Makefile
     * @param action            The build action to take
     * @param messageHandler    The message handler object
     */
    public static async buildMakeV4(appRoot: string, filePath: string, action: number, messageHandler: MessageHandler): Promise<void> {
        try {
            return SourceArchiveUtils.buildSourceArchive({
                appRoot,
                buildId: null,
                bundleToolkits: false,
                fqn: null,
                makefilePath: filePath,
                toolkitRootPath: this._toolkitsPath
            }).then((result: any) => {
                if (result.archivePath) {
                    const lintHandler = new LintHandler(appRoot);
                    const builder = new SplBuilder(messageHandler, lintHandler, this._openUrlHandler, this._originator, { appRoot, makefilePath: filePath });
                    builder.build(action, this._streamingAnalyticsCredentials, { filename: result.archivePath });
                }
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Handle a build of a Makefile to Streams V5
     * @param appRoot     The application root path
     * @param filePath    The path to the Makefile
     * @param action      The build action to take
     */
    public static async buildMakeV5(appRoot: string, filePath: string, action: number): Promise<void> {
        const newBuildAction = newBuild({
            appRoot,
            fqn: null,
            makefilePath: filePath,
            postBuildAction: action,
            toolkitRootPath: this._toolkitsPath
        });

        if (!StateSelector.hasAuthenticatedToStreamsInstance(getStore().getState())) {
            getStore().dispatch(queueAction(newBuildAction));
            this.showIcp4dAuthPanel();
        } else {
            getStore().dispatch(newBuildAction);
        }
    }

    /**
     * Submit application bundle(s)
     * @param filePaths    The paths to the application bundle(s)
     */
    public static async submit(filePaths: string[]): Promise<void> {
        if (filePaths) {
            if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
                const handleSubmitV5 = () => this.submitV5(filePaths);
                if (StateSelector.getIcp4dUrl(getStore().getState())) {
                    handleSubmitV5();
                } else {
                    this.handleIcp4dUrlNotSet(handleSubmitV5);
                }
            } else {
                this.submitV4(filePaths[0]);
            }
        } else {
            throw new Error('Unable to retrieve file paths');
        }
    }

    /**
     * Handle a submission of an application bundle to Streams V4
     * @param filePath    The path to the application bundle
     */
    public static async submitV4(filePath: string): Promise<void> {
        if (!filePath || !filePath.toLowerCase().endsWith('.sab')) {
            return;
        }

        try {
            const workspaceFolders = _.map(workspace.workspaceFolders, (folder: WorkspaceFolder) => folder.uri.fsPath);
            const appRoot = SplBuilder.getApplicationRoot(workspaceFolders, filePath);

            let messageHandler = MessageHandlerRegistry.get(filePath);
            if (!messageHandler) {
                messageHandler = new MessageHandler({ appRoot, filePath });
                MessageHandlerRegistry.add(filePath, messageHandler);
            }

            const displayPath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePath)}`;
            const outputChannel = SplLogger.registerOutputChannel(filePath, displayPath);

            const statusMessage = 'Received request to submit an application';
            SplLogger.info(outputChannel, statusMessage, false, true);
            SplLogger.debug(outputChannel, `Selected: ${filePath}`);

            const lintHandler = new LintHandler(appRoot);
            const builder = new SplBuilder(messageHandler, lintHandler, this._openUrlHandler, this._originator);
            builder.submit(this._streamingAnalyticsCredentials, { filename: filePath });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Handle a submission of application bundle(s) to Streams V5
     * @param filePaths    The paths to the application bundle(s)
     */
    public static async submitV5(filePaths: string[]): Promise<void> {
        const bundles = filePaths
            .filter((filePath: string) => filePath.toLowerCase().endsWith('.sab'))
            .map((filePath: string) => ({
                bundlePath: filePath,
                jobConfig: null,
                jobGroup: 'default',
                jobName: filePath.split(path.sep).pop().split('.sab')[0]
            }));
        const submitAction = submitApplicationsFromBundleFiles(bundles);

        if (!StateSelector.hasAuthenticatedToStreamsInstance(getStore().getState())) {
            getStore().dispatch(queueAction(submitAction));
            this.showIcp4dAuthPanel();
        } else {
            getStore().dispatch(submitAction);
        }
    }

    /**
     * Open IBM Streaming Analytics Console
     */
    public static openStreamingAnalyticsConsole() {
        if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V4) {
            try {
                const builder = new SplBuilder(null, null, this._openUrlHandler, null);
                const openConsole = (setting: any) => {
                    const streamingAnalyticsCredentials = setting ? JSON.stringify(setting) : null;
                    builder.openStreamingAnalyticsConsole(streamingAnalyticsCredentials, (url: string) => SplLogger.info(null, `Streaming Analytics Console: ${url}`));
                };

                const credentialsSetting = SplConfig.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS);
                if (!credentialsSetting) {
                    window.showWarningMessage('IBM Streaming Analytics service credentials are not set', 'Set credentials').then((selection: string) => {
                        if (selection) {
                            commands.executeCommand(Commands.SET_SERVICE_CREDENTIALS, openConsole);
                        }
                    });
                } else {
                    openConsole(credentialsSetting);
                }
            } catch (error) {
                SplLogger.error(null, 'Error opening IBM Streaming Analytics Console', true);
                if (error.stack) {
                    SplLogger.error(null, error.stack);
                }
            }
        }
    }

    /**
     * Open IBM Cloud Dashboard
     */
    public static openCloudDashboard() {
        if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V4) {
            try {
                const builder = new SplBuilder(null, null, this._openUrlHandler, null);
                builder.openCloudDashboard((url: string) => SplLogger.info(null, `Opened IBM Cloud Dashboard: ${url}`));
            } catch (error) {
                SplLogger.error(null, 'Error opening IBM Cloud Dashboard', true);
                if (error.stack) {
                    SplLogger.error(null, error.stack);
                }
            }
        }
    }

    /**
     * Open IBM Streams Console
     */
    public static openStreamsConsole() {
        if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
            const handleOpenStreamsConsole = () => {
                try {
                    const openUrl = () => {
                        const consoleUrl = StateSelector.getStreamsConsoleUrl(getStore().getState());
                        this._openUrlHandler(
                            consoleUrl,
                            () => SplLogger.info(null, `Opened IBM Streams Console: ${consoleUrl}`)
                        );
                    };
                    if (!StateSelector.hasAuthenticatedToStreamsInstance(getStore().getState())) {
                        const callbackAction = executeCallbackFn(openUrl);
                        getStore().dispatch(queueAction(callbackAction));
                        this.showIcp4dAuthPanel();
                    } else {
                        openUrl();
                    }
                } catch (error) {
                    SplLogger.error(null, 'Error opening IBM Streams Console', true);
                    if (error.stack) {
                        SplLogger.error(null, error.stack);
                    }
                }
            };

            if (StateSelector.getIcp4dUrl(getStore().getState())) {
                handleOpenStreamsConsole();
            } else {
                this.handleIcp4dUrlNotSet(handleOpenStreamsConsole);
            }
        }
    }

    /**
     * Open IBM Cloud Private for Data Dashboard
     */
    public static openIcp4dDashboard() {
        if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
            const handleOpenIcp4dDashboard = () => {
                try {
                    const icp4dUrl = StateSelector.getIcp4dUrl(getStore().getState());
                    const icp4dDashboard = `${icp4dUrl}/zen/#/homepage`;
                    this._openUrlHandler(
                        icp4dDashboard,
                        () => SplLogger.info(null, `Opened IBM Cloud Private for Data Dashboard: ${icp4dDashboard}`)
                    );
                } catch (error) {
                    SplLogger.error(null, 'Error opening IBM Cloud Private for Data Dashboard', true);
                    if (error.stack) {
                        SplLogger.error(null, error.stack);
                    }
                }
            };

            if (StateSelector.getIcp4dUrl(getStore().getState())) {
                handleOpenIcp4dDashboard();
            } else {
                this.handleIcp4dUrlNotSet(handleOpenIcp4dDashboard);
            }
        }
    }

    /**
     * Get the main composite to build. Prompt the user to select if
     * there are multiple composites defined and there is no Makefile.
     * @param appRoot       The application root path
     * @param namespace     The defined namespace
     * @param composites    The defined composites
     */
    private static async getCompositeToBuild(appRoot: string, namespace: string, composites: string[]): Promise<string> {
        if (composites.length === 1) {
            if (namespace === '') {
               return composites[0];
            } else {
                return `${namespace}::${composites[0]}`;
            }
        } else {
            return window.showQuickPick(composites, {
                ignoreFocusOut: true,
                placeHolder: 'Select the main composite to build...'
            }).then((composite: string) => {
                if (composite) {
                    if (namespace === '') {
                        return composite;
                    } else {
                        return `${namespace}::${composite}`;
                    }
                } else {
                    throw new Error(`Build canceled, a main composite was not selected`);
                }
            });
        }
    }

    /**
     * Update ICP4D URL in the Redux store
     * @param urlString    The ICP4D URL
     */
    private static updateIcp4dUrl(urlString: string): void {
        try {
            const url = new URL(urlString);
            const prunedUrl = `${url.protocol || 'https:'}//${url.host}`;
            getStore().dispatch(setIcp4dUrl(prunedUrl));
        } catch (err) {
            getStore().dispatch(setIcp4dUrl(null));
        }
    }

    /**
     * Handle the scenario where the IBM Cloud Private for Data URL is not specified
     */
    private static handleIcp4dUrlNotSet(callbackFn: () => void) {
        MessageHandlerRegistry.getDefault().handleIcp4dUrlNotSet(callbackFn);
    }

    /**
     * Show ICP4D authentication webview panel if not yet authenticated
     */
    private static showIcp4dAuthPanel() {
        const username = StateSelector.getFormUsername(getStore().getState()) || StateSelector.getUsername(getStore().getState());
        const rememberPassword = StateSelector.getFormRememberPassword(getStore().getState()) || StateSelector.getRememberPassword(getStore().getState());
        if (username && rememberPassword) {
            Keychain.getCredentials(username).then((password: string) => {
                getStore().dispatch(setFormDataField('password', password));
            });
        }
        commands.executeCommand(Commands.SHOW_ICP4D_SETTINGS_WEBVIEW_PANEL);
    }
}
