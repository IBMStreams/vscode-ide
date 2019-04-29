import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import { URL } from 'url';
import { commands, ConfigurationChangeEvent, Disposable, ExtensionContext, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';
import * as packageJson from '../../package.json';
import { Commands } from '../commands';
import SplLanguageClient from '../languageClient';
import { Configuration, Constants, inDebugMode, Keychain, Logger, Settings } from '../utils';
import { ICP4DWebviewPanel } from '../webviews';
import LintHandlerRegistry from './lint-handler-registry';
import LintHandler from './LintHandler';
import MessageHandlerRegistry from './message-handler-registry';
import MessageHandler from './MessageHandler';
import { SplBuilder, SplBuildCommonV4 } from './v4/spl-build-common';
import {
    checkIcp4dHostExists,
    executeCallbackFn,
    newBuild,
    packageActivated,
    queueAction,
    refreshToolkits,
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
import { SourceArchiveUtils, StateSelector, StreamsToolkitsUtils, StreamsUtils, StreamsRestUtils } from './v5/util';

/**
 * Handles Streams builds and submissions
 */
export default class StreamsBuild {
    private static _context: ExtensionContext;
    private static _streamingAnalyticsCredentials: string;
    private static _toolkitPaths: string;
    private static _apiVersion: string;
    private static _originator: object;
    private static _storeSubscription: any;
    private static _openUrlHandler: (url: string, callback?: () => void) => void;
    private static _sendLspNotificationHandler: (param: object) => void;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this._context = context;

        const credentialsSetting = Configuration.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS);
        this._streamingAnalyticsCredentials = credentialsSetting ? JSON.stringify(credentialsSetting) : null;

        const toolkitPathsSetting = Configuration.getSetting(Settings.TOOLKIT_PATHS);
        this._toolkitPaths = toolkitPathsSetting !== '' && toolkitPathsSetting !== Settings.TOOLKIT_PATHS_DEFAULT ? toolkitPathsSetting : null;
        getStore().dispatch(setToolkitsPathSetting(this._toolkitPaths));

        this._apiVersion = Configuration.getSetting(Settings.TARGET_VERSION);

        this._originator = { originator: 'vscode', version: packageJson.version, type: 'spl' };

        const timeout = Configuration.getSetting(Settings.REQUEST_TIMEOUT);
        StreamsRestUtils.setTimeout(timeout);
        SplBuildCommonV4.setTimeout(timeout);

        this._storeSubscription = getStore().subscribe(() => {
            if (inDebugMode()) {
                console.log('Store subscription updated state: ', getStore().getState());
            }
        });
        context.subscriptions.push(new Disposable(() => {
            this._storeSubscription();
        }));

        if (!StateSelector.getIcp4dUrl(getStore().getState())) {
            this.updateIcp4dUrl(Configuration.getSetting(Settings.ICP4D_URL));
        }

        if (!StateSelector.getUseIcp4dMasterNodeHost(getStore().getState())) {
            getStore().dispatch(setUseIcp4dMasterNodeHost(Configuration.getSetting(Settings.ICP4D_USE_MASTER_NODE_HOST)));
        }

        const username = Configuration.getState(`${Constants.EXTENSION_NAME}.username`);
        const rememberPassword = Configuration.getState(`${Constants.EXTENSION_NAME}.rememberPassword`);
        if (username) {
            getStore().dispatch(setUsername(username));
        }
        if (rememberPassword) {
            getStore().dispatch(setRememberPassword(rememberPassword));
        }

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
            if (!event.affectsConfiguration(Settings.SECTION_ID)) {
                return;
            }

            if (event.affectsConfiguration(Settings.ICP4D_URL)) {
                this.updateIcp4dUrl(Configuration.getSetting(Settings.ICP4D_URL));
                getStore().dispatch(resetAuth());
                ICP4DWebviewPanel.close();
            }

            if (event.affectsConfiguration(Settings.ICP4D_USE_MASTER_NODE_HOST)) {
                const useHostSetting = Configuration.getSetting(Settings.ICP4D_USE_MASTER_NODE_HOST);
                getStore().dispatch(setUseIcp4dMasterNodeHost(useHostSetting));
            }

            if (event.affectsConfiguration(Settings.ICP4D_USE_MASTER_NODE_HOST)) {
                const timeoutSetting = Configuration.getSetting(Settings.REQUEST_TIMEOUT);
                StreamsRestUtils.setTimeout(timeoutSetting);
                SplBuildCommonV4.setTimeout(timeoutSetting);
            }

            if (event.affectsConfiguration(Settings.STREAMING_ANALYTICS_CREDENTIALS)) {
                const currentCredentialsSetting = Configuration.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS);
                this._streamingAnalyticsCredentials = currentCredentialsSetting ? JSON.stringify(currentCredentialsSetting) : null;
            }

            if (event.affectsConfiguration(Settings.TARGET_VERSION)) {
                this._apiVersion = Configuration.getSetting(Settings.TARGET_VERSION);
            }

            if (event.affectsConfiguration(Settings.TOOLKIT_PATHS)) {
                const currentToolkitPathsSetting = Configuration.getSetting(Settings.TOOLKIT_PATHS);
                this._toolkitPaths = currentToolkitPathsSetting !== '' && currentToolkitPathsSetting !== Settings.TOOLKIT_PATHS_DEFAULT ? currentToolkitPathsSetting : null;
                getStore().dispatch(setToolkitsPathSetting(this._toolkitPaths));
            }
        }));

        getStore().dispatch(packageActivated());
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
            const compositeToBuild = await this.getCompositeToBuild(namespace, mainComposites);

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
            const outputChannel = Logger.registerOutputChannel(filePath, displayPath);

            const statusMessage = `Received request to build${action === SplBuilder.BUILD_ACTION.SUBMIT ? ' and submit' : ''}`;
            Logger.info(outputChannel, statusMessage, false, true);
            Logger.debug(outputChannel, `Selected: ${filePath}`);

            if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
                const build = () => this.buildAppV5(appRoot, compositeToBuild, action);
                this.handleV5Action(build);
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
    private static async buildAppV4(appRoot: string, compositeToBuild: string, action: number, messageHandler: MessageHandler): Promise<void> {
        try {
            return SourceArchiveUtils.buildSourceArchive({
                appRoot,
                buildId: null,
                fqn: compositeToBuild,
                makefilePath: null,
                toolkitPathSetting: Configuration.getState(Settings.TOOLKIT_PATHS),
                toolkitCacheDir: StateSelector.getToolkitsCacheDir(getStore().getState())
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
    private static async buildAppV5(appRoot: string, compositeToBuild: string, action: number): Promise<void> {
        const newBuildAction = newBuild({
            appRoot,
            fqn: compositeToBuild,
            makefilePath: null,
            postBuildAction: action,
            toolkitRootPath: this._toolkitPaths
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
            const outputChannel = Logger.registerOutputChannel(filePath, displayPath);

            const statusMessage = `Received request to build from a Makefile${action === SplBuilder.BUILD_ACTION.SUBMIT ? ' and submit' : ''}`;
            Logger.info(outputChannel, statusMessage, false, true);
            Logger.debug(outputChannel, `Selected: ${filePath}`);

            if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
                const build = () => this.buildMakeV5(appRoot, filePath, action);
                this.handleV5Action(build);
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
    private static async buildMakeV4(appRoot: string, filePath: string, action: number, messageHandler: MessageHandler): Promise<void> {
        try {
            return SourceArchiveUtils.buildSourceArchive({
                appRoot,
                buildId: null,
                fqn: null,
                makefilePath: filePath,
                toolkitPathSetting: Configuration.getState(Settings.TOOLKIT_PATHS),
                toolkitCacheDir: StateSelector.getToolkitsCacheDir(getStore().getState())
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
    private static async buildMakeV5(appRoot: string, filePath: string, action: number): Promise<void> {
        const newBuildAction = newBuild({
            appRoot,
            fqn: null,
            makefilePath: filePath,
            postBuildAction: action,
            toolkitRootPath: this._toolkitPaths
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
                const submit = () => this.submitV5(filePaths);
                this.handleV5Action(submit);
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
    private static async submitV4(filePath: string): Promise<void> {
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
            const outputChannel = Logger.registerOutputChannel(filePath, displayPath);

            const statusMessage = 'Received request to submit an application';
            Logger.info(outputChannel, statusMessage, false, true);
            Logger.debug(outputChannel, `Selected: ${filePath}`);

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
    private static async submitV5(filePaths: string[]): Promise<void> {
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
                    builder.openStreamingAnalyticsConsole(streamingAnalyticsCredentials, (url: string) => Logger.info(null, `Streaming Analytics Console: ${url}`));
                };

                const credentialsSetting = Configuration.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS);
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
                Logger.error(null, 'Error opening IBM Streaming Analytics Console', true);
                if (error.stack) {
                    Logger.error(null, error.stack);
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
                builder.openCloudDashboard((url: string) => Logger.info(null, `Opened IBM Cloud Dashboard: ${url}`));
            } catch (error) {
                Logger.error(null, 'Error opening IBM Cloud Dashboard', true);
                if (error.stack) {
                    Logger.error(null, error.stack);
                }
            }
        }
    }

    /**
     * Open IBM Streams Console
     */
    public static openStreamsConsole() {
        if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
            const openConsole = () => {
                try {
                    const openUrl = () => {
                        const consoleUrl = StateSelector.getStreamsConsoleUrl(getStore().getState());
                        this._openUrlHandler(
                            consoleUrl,
                            () => Logger.info(null, `Opened IBM Streams Console: ${consoleUrl}`)
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
                    Logger.error(null, 'Error opening IBM Streams Console', true);
                    if (error.stack) {
                        Logger.error(null, error.stack);
                    }
                }
            };
            this.handleV5Action(openConsole);
        }
    }

    /**
     * Open IBM Cloud Private for Data Dashboard
     */
    public static openIcp4dDashboard() {
        if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
            const openDashboard = () => {
                try {
                    const icp4dUrl = StateSelector.getIcp4dUrl(getStore().getState());
                    const icp4dDashboard = `${icp4dUrl}/zen/#/homepage`;
                    this._openUrlHandler(
                        icp4dDashboard,
                        () => Logger.info(null, `Opened IBM Cloud Private for Data Dashboard: ${icp4dDashboard}`)
                    );
                } catch (error) {
                    Logger.error(null, 'Error opening IBM Cloud Private for Data Dashboard', true);
                    if (error.stack) {
                        Logger.error(null, error.stack);
                    }
                }
            };
            this.handleV5Action(openDashboard);
        }
    }

    /**
     * List available toolkits
     */
    public static listToolkits() {
        const cachedToolkits = StreamsToolkitsUtils.getCachedToolkits(StateSelector.getToolkitsCacheDir(getStore().getState())).map((tk: any) => tk.label);
        const cachedToolkitsStr = `\nBuild service toolkits:${cachedToolkits.length ? `\n\n${cachedToolkits.join('\n')}` : ' none'}`;

        const localToolkitPathsSetting = Configuration.getSetting(Settings.TOOLKIT_PATHS);
        let localToolkitsStr = '';
        if (localToolkitPathsSetting && localToolkitPathsSetting.length > 0) {
            const localToolkits = StreamsToolkitsUtils.getLocalToolkits(localToolkitPathsSetting).map((tk: any) => tk.label);
            localToolkitsStr = `\n\nLocal toolkits from ${localToolkitPathsSetting}:${localToolkits.length ? `\n\n${localToolkits.join('\n')}` : ' none'}`;
        }
        window.showInformationMessage('The available IBM Streams toolkits are displayed in the IBM Streams output channel.');
        MessageHandlerRegistry.getDefault().handleInfo(
            'Streams toolkits:',
            {
                detail: `${cachedToolkitsStr}${localToolkitsStr}`,
                showNotification: false
            }
        );
    }

    /**
     * Refresh toolkits on the LSP server
     */
    public static refreshLspToolkits() {
        if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
            const refresh = () => {
                const toolkitPathsSetting = Configuration.getSetting(Settings.TOOLKIT_PATHS);
                if (typeof toolkitPathsSetting === 'string' && toolkitPathsSetting.length > 0) {
                    if (toolkitPathsSetting.match(/[,;]/)) {
                        const directories = toolkitPathsSetting.split(/[,;]/);
                        const directoriesInvalid = _.some(directories, (dir: string) => dir !== Settings.TOOLKIT_PATHS_DEFAULT && !fs.existsSync(dir));
                        if (directoriesInvalid) {
                            MessageHandlerRegistry.getDefault().handleError(
                                'One or more toolkit paths do not exist or are not valid. Verify the paths.',
                                {
                                    detail: `Verify that the paths exist:\n${directories.join('\n')}`,
                                    notificationButtons: [{
                                            label: 'Open settings',
                                            callbackFn: () => MessageHandlerRegistry.getDefault().openSettingsPage()
                                    }]
                                }
                            );
                            return;
                        }
                    } else if (toolkitPathsSetting !== Settings.TOOLKIT_PATHS_DEFAULT && !fs.existsSync(toolkitPathsSetting)) {
                        MessageHandlerRegistry.getDefault().handleError(
                            `The specified toolkit path ${toolkitPathsSetting} does not exist or is not valid. Verify the path.`,
                            {
                                detail: `Verify that the path exists: ${toolkitPathsSetting}`,
                                notificationButtons: [{
                                    label: 'Open settings',
                                    callbackFn: () => MessageHandlerRegistry.getDefault().openSettingsPage()
                                }]
                            }
                        );
                        return;
                    }
                    const toolkitsPath = toolkitPathsSetting !== '' && toolkitPathsSetting !== Settings.TOOLKIT_PATHS_DEFAULT ? toolkitPathsSetting : null;
                    getStore().dispatch(setToolkitsPathSetting(toolkitsPath));
                }

                if (!StateSelector.hasAuthenticatedToStreamsInstance(getStore().getState())) {
                    // Authenticating automatically refreshes the toolkits
                    this.showIcp4dAuthPanel();
                } else {
                    getStore().dispatch(refreshToolkits());
                }
            };
            this.handleV5Action(refresh);
        } else {
            StreamsToolkitsUtils.refreshLspToolkits(getStore().getState(), this._sendLspNotificationHandler);
        }
    }

    /**
     * Get the main composite to build. Prompt the user to select if
     * there are multiple composites defined and there is no Makefile.
     * @param namespace     The defined namespace
     * @param composites    The defined composites
     */
    private static async getCompositeToBuild(namespace: string, composites: string[]): Promise<string> {
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
     * Handle a build or submission
     * @param callbackFn    The callback function to execute
     */
    private static async handleV5Action(callbackFn: () => void) {
        const icp4dUrl = StateSelector.getIcp4dUrl(getStore().getState());
        if (icp4dUrl) {
            const successFn = callbackFn;
            const errorFn = () => this.handleIcp4dUrlNotSet(this.handleV5Action.bind(this, callbackFn));
            getStore().dispatch(checkIcp4dHostExists(successFn, errorFn));
        } else {
            this.handleIcp4dUrlNotSet(this.handleV5Action.bind(this, callbackFn));
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
     * @param callbackFn    The callback function to execute
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
