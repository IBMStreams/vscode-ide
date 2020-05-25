import {
    Build,
    Editor,
    EditorAction,
    EditorSelector,
    generateRandomId,
    Instance,
    InstanceSelector,
    PostBuildAction,
    Registry,
    SourceArchiveUtils,
    store,
    StreamsInstanceType,
    StreamsRest,
    StreamsUtils,
    SubmitJob,
    ToolkitUtils
} from '@streams/common';
import * as fs from 'fs';
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
import { getStreamsExplorer } from '../views';
import { Streams, StreamsInstance } from '../streams';
import {
    Authentication,
    BuiltInCommands,
    Configuration,
    EXTENSION_ID,
    isLoggingEnabled,
    Keychain,
    LANGUAGE_SPL,
    Logger,
    Settings,
    TOOLKITS_CACHE_DIR
} from '../utils';
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
     * @param context    The extension context
     */
    public static async configure(context: ExtensionContext): Promise<void> {
        this._context = context;

        if (!fs.existsSync(TOOLKITS_CACHE_DIR)) {
            fs.mkdirSync(TOOLKITS_CACHE_DIR);
        }

        const toolkitPathsSetting = Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS);
        this._toolkitPaths = toolkitPathsSetting !== '' && toolkitPathsSetting !== Settings.ENV_TOOLKIT_PATHS_DEFAULT ? toolkitPathsSetting : null;

        const timeout = Configuration.getSetting(Settings.ENV_TIMEOUT_FOR_REQUESTS);
        StreamsRest.setRequestTimeout(timeout);

        this.initUtilRegistry();
        this.monitorConfigSettingChanges();
        await this.initReduxState();
        this.monitorOpenSplFile();
    }

    /**
     * Perform a build of an SPL file and either download the bundle or submit the application
     * @param filePath    The path to the SPL file
     * @param action      The post-build action to take
     */
    public static async buildApp(filePath: string, action: PostBuildAction): Promise<void> {
        const defaultInstance = Streams.checkDefaultInstance();
        if (filePath) {
            const filePaths = [filePath];
            const zeroInstancesCallbackFn = (): void => { this.runBuildApp(Streams.getDefaultInstance(), filePaths, action); };
            const oneInstanceCallbackFn = (): void => { this.runBuildApp(defaultInstance, filePaths, action); };
            const multipleInstancesCallbackFn = (): void => { this.showInstancePanel('build', filePaths, action); }
            this.handleAction('build', zeroInstancesCallbackFn, oneInstanceCallbackFn, multipleInstancesCallbackFn);
        } else {
            this._defaultMessageHandler.handleError('The build failed. Unable to retrieve the application file path.');
        }
    }

    /**
     * Handle building of an application
     * @param targetInstance    The target Streams instance
     * @param filePaths         The selected file paths
     * @param action            The post-build action to take
     */
    public static async runBuildApp(targetInstance: any, filePaths: string[], action: PostBuildAction): Promise<void> {
        const { appRoot, compositeToBuild, messageHandler } = await this.initBuild('buildApp', filePaths[0], action);
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
                    store.dispatch(EditorAction.addQueuedAction({
                        id: queuedActionId,
                        action: Editor.executeCallbackFn(buildApp)
                    }));
                    StreamsInstance.authenticate(targetInstance, false, queuedActionId);
                } else {
                    messageHandler.handleInfo(
                        `Selected Streams instance: ${InstanceSelector.selectInstanceName(store.getState(), targetInstance.connectionId)}.`,
                        { showNotification: false }
                    );
                    store.dispatch(startBuildAction)
                        .then(() => {
                            if (action === PostBuildAction.Submit) {
                                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                            }
                        })
                        .catch((err) => {
                            if (action === PostBuildAction.Submit) {
                                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                            }
                            let errorMsg: string;
                            if (err && err.message && err.message.startsWith('Failed to build')) {
                                errorMsg = err.message;
                            } else {
                                const instanceName = InstanceSelector.selectInstanceName(store.getState(), targetInstance.connectionId);
                                errorMsg = `Failed to build${action === PostBuildAction.Submit ? ' and submit' : ''} the application ${compositeToBuild} using the Streams instance ${instanceName}.`;
                            }
                            this.handleError(err, messageHandler, errorMsg);
                        });
                }
            }
        }
        buildApp();
    }

    /**
     * Perform a build from a Makefile and either download the bundle(s) or submit the application(s)
     * @param filePath    The path to the Makefile
     * @param action      The post-build action to take
     */
    public static async buildMake(filePath: string, action: PostBuildAction): Promise<void> {
        const defaultInstance = Streams.checkDefaultInstance();
        if (filePath) {
            const filePaths = [filePath];
            const zeroInstancesCallbackFn = (): void => { this.runBuildMake(Streams.getDefaultInstance(), filePaths, action); };
            const oneInstanceCallbackFn = (): void => { this.runBuildMake(defaultInstance, filePaths, action); };
            const multipleInstancesCallbackFn = (): void => { this.showInstancePanel('build-make', filePaths, action); }
            this.handleAction('build', zeroInstancesCallbackFn, oneInstanceCallbackFn, multipleInstancesCallbackFn);
        } else {
            this._defaultMessageHandler.handleError('The build failed. Unable to retrieve the Makefile file path.');
        }
    }

    /**
     * Handle building of a Makefile
     * @param targetInstance    The target Streams instance
     * @param filePaths         The selected file paths
     * @param action            The post-build action to take
     */
    public static async runBuildMake(targetInstance: any, filePaths: string[], action: PostBuildAction): Promise<void> {
        const { appRoot, messageHandler } = await StreamsBuild.initBuild('buildMake', filePaths[0], action);
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
                    store.dispatch(EditorAction.addQueuedAction({
                        id: queuedActionId,
                        action: Editor.executeCallbackFn(buildMake)
                    }));
                    StreamsInstance.authenticate(targetInstance, false, queuedActionId);
                } else {
                    messageHandler.handleInfo(
                        `Selected Streams instance: ${InstanceSelector.selectInstanceName(store.getState(), targetInstance.connectionId)}.`,
                        { showNotification: false }
                    );
                    store.dispatch(startBuildAction)
                        .then(() => {
                            if (action === PostBuildAction.Submit) {
                                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                            }
                        })
                        .catch((err) => {
                            if (action === PostBuildAction.Submit) {
                                setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                            }
                            let errorMsg: string;
                            if (err && err.message && err.message.startsWith('Failed to build')) {
                                errorMsg = err.message;
                            } else {
                                const identifier = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePaths[0])}`;
                                const instanceName = InstanceSelector.selectInstanceName(store.getState(), targetInstance.connectionId);
                                errorMsg = `Failed to build${action === PostBuildAction.Submit ? ' and submit' : ''} the application(s) in ${identifier} using the Streams instance ${instanceName}.`;
                            }
                            this.handleError(err, messageHandler, errorMsg);
                        });
                }
            }
        }
        buildMake();
    }

    /**
     * Submit application bundle(s)
     * @param filePaths    The paths to the application bundle(s)
     */
    public static async submit(filePaths: string[]): Promise<void> {
        if (filePaths) {
            const defaultInstance = Streams.checkDefaultInstance();
            const bundleFilePaths = this.initSubmit(filePaths);
            if (!bundleFilePaths.length) {
                this._defaultMessageHandler.handleInfo('There are no Streams application bundles to submit.');
                return;
            }
            const zeroInstancesCallbackFn = (): void => { this.runSubmit(Streams.getDefaultInstance(), bundleFilePaths); };
            const oneInstanceCallbackFn = (): void => { this.runSubmit(defaultInstance, bundleFilePaths); };
            const multipleInstancesCallbackFn = (): void => { this.showInstancePanel('submit', bundleFilePaths, null); }
            this.handleAction('submission(s)', zeroInstancesCallbackFn, oneInstanceCallbackFn, multipleInstancesCallbackFn);
        } else {
            this._defaultMessageHandler.handleError('The submission failed. Unable to retrieve the application bundle file paths.');
        }
    }

    /**
     * Handle submission of application bundles
     * @param targetInstance    The target Streams instance
     * @param filePaths         The selected file paths
     */
    public static runSubmit(targetInstance: any, bundleFilePaths: string[]): void {
        const submit = (): void => {
            if (targetInstance) {
                const startSubmitJobAction = SubmitJob.startSubmitJobFromApplicationBundles(bundleFilePaths, targetInstance);
                if (!Authentication.isAuthenticated(targetInstance)) {
                    const queuedActionId = generateRandomId('queuedAction');
                    store.dispatch(EditorAction.addQueuedAction({
                        id: queuedActionId,
                        action: Editor.executeCallbackFn(submit)
                    }));
                    StreamsInstance.authenticate(targetInstance, false, queuedActionId);
                } else {
                    this._defaultMessageHandler.handleInfo(
                        `Selected Streams instance: ${InstanceSelector.selectInstanceName(store.getState(), targetInstance.connectionId)}.`,
                        { showNotification: false }
                    );
                    store.dispatch(startSubmitJobAction)
                        .then(() => {
                            setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                        })
                        .catch((err) => {
                            setTimeout(() => StreamsInstance.refreshInstances(), 2000);
                            let errorMsg: string;
                            if (err && err.message && err.message.startsWith('Failed to submit')) {
                                errorMsg = err.message;
                            } else {
                                const instanceName = InstanceSelector.selectInstanceName(store.getState(), targetInstance.connectionId);
                                errorMsg = `Failed to submit the applications to the Streams instance ${instanceName}.`;
                            }
                            this.handleError(err, this._defaultMessageHandler, errorMsg);
                        });
                }
            }
        }
        submit();
    }

    /**
     * Get display path for builds
     * @param appRoot     The application root path
     * @param filePath    The path to the SPL file or Makefile
     */
    public static getDisplayPath(appRoot: string, filePath: string): string {
        return `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePath)}`;
    }

    /**
     * List available toolkits
     */
    public static listToolkits(): void {
        const cachedToolkits = ToolkitUtils.getCachedToolkits(EditorSelector.selectToolkitsCacheDir(store.getState())).map((tk: any) => tk.label);
        const cachedToolkitsStr = `\nBuild service toolkits:${cachedToolkits.length ? `\n  ${cachedToolkits.join('\n  ')}` : ' none'}`;

        const localToolkitPathsSetting = Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS);
        let localToolkitsStr = '';
        if (localToolkitPathsSetting && localToolkitPathsSetting.length > 0) {
            const localToolkits = ToolkitUtils.getLocalToolkits(localToolkitPathsSetting).map((tk: any) => tk.label);
            localToolkitsStr = `\n\nLocal toolkits from ${localToolkitPathsSetting}:${localToolkits.length ? `\n  ${localToolkits.join('\n  ')}` : ' none'}`;
        }
        window.showInformationMessage('The available IBM Streams toolkits are displayed in the IBM Streams output channel.');
        this._defaultMessageHandler.handleInfo(
            'Streams toolkits:',
            {
                detail: `${cachedToolkitsStr}${localToolkitsStr}`,
                showNotification: false
            }
        );
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
        const isStreamsV5 = instanceType === StreamsInstanceType.V5_CPD || instanceType === StreamsInstanceType.V5_STANDALONE;
        if (isStreamsV5) {
            if (!Authentication.isAuthenticated(defaultInstance)) {
                // Authenticating automatically refreshes the toolkits
                StreamsInstance.authenticate(null, true, null);
            } else {
                const toolkitPathsSetting = Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS);
                if (typeof toolkitPathsSetting === 'string' && toolkitPathsSetting.length > 0) {
                    if (toolkitPathsSetting.match(/[,;]/)) {
                        const directories = toolkitPathsSetting.split(/[,;]/);
                        const directoriesInvalid = _some(directories, (dir: string) => dir !== Settings.ENV_TOOLKIT_PATHS_DEFAULT && !fs.existsSync(dir));
                        if (directoriesInvalid) {
                            this._defaultMessageHandler.handleError(
                                'One or more toolkit paths do not exist or are not valid. Verify the paths.',
                                {
                                    detail: `Verify that the paths exist:\n${directories.join('\n')}`,
                                    notificationButtons: [{
                                        label: 'Open Settings',
                                        callbackFn: () => this._defaultMessageHandler.openSettingsPage()
                                    }]
                                }
                            );
                            return;
                        }
                    } else if (toolkitPathsSetting !== Settings.ENV_TOOLKIT_PATHS_DEFAULT && !fs.existsSync(toolkitPathsSetting)) {
                        this._defaultMessageHandler.handleError(
                            `The specified toolkit path ${toolkitPathsSetting} does not exist or is not valid. Verify the path.`,
                            {
                                detail: `Verify that the path exists: ${toolkitPathsSetting}`,
                                notificationButtons: [{
                                    label: 'Open Settings',
                                    callbackFn: () => this._defaultMessageHandler.openSettingsPage()
                                }]
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
     * Initialize util registry
     */
    private static initUtilRegistry(): void {
        if (!Registry.getDefaultMessageHandler()) {
            this._defaultMessageHandler = new MessageHandler(null);
            Registry.setDefaultMessageHandler(this._defaultMessageHandler);
        }

        Registry.setSystemKeychain(Keychain);

        this._openUrlHandler = (url: string, callback?: () => void): Thenable<void> => commands.executeCommand(BuiltInCommands.Open, Uri.parse(url)).then(() => callback && callback());
        Registry.setOpenUrlHandler(this._openUrlHandler);

        this._sendLspNotificationHandler = (param: object) => SplLanguageClient.getClient().sendNotification(DidChangeConfigurationNotification.type.method, param);
        Registry.setSendLspNotificationHandler(this._sendLspNotificationHandler);

        const copyToClipboardHandler = (text: string): Thenable<void> => env.clipboard.writeText(text);
        Registry.setCopyToClipboardHandler(copyToClipboardHandler);

        const showJobGraphHandler = (properties: object): Thenable<void> => commands.executeCommand(Commands.ENVIRONMENT.SHOW_JOB_GRAPH, properties);
        Registry.setShowJobGraphHandler(showJobGraphHandler);

        const showJobSubmitDialogHandler = (opts: object): Thenable<void> => commands.executeCommand(Commands.BUILD.CONFIGURE_JOB_SUBMISSION, opts);
        Registry.setShowJobSubmitHandler(showJobSubmitDialogHandler);
    }

    /**
     * Initialize Redux state
     */
    private static async initReduxState(): Promise<void> {
        store.dispatch(EditorAction.setIsActivated(true));
        store.dispatch(EditorAction.setOriginatingTool({ tool: 'vscode', version: packageJson.version }));
        store.dispatch(EditorAction.setToolkitPathsSetting(this._toolkitPaths));
        store.dispatch(EditorAction.setToolkitsCacheDir(TOOLKITS_CACHE_DIR));
        store.dispatch(EditorAction.setRefreshInterval(Configuration.getSetting(Settings.ENV_REFRESH_INTERVAL)));
        store.dispatch(EditorAction.setUpdateStreamsInstancesHandler(async (instances: any[]) => {
            instances = instances.map((instance: any) => _omit(instance, ['streamsInstance', 'streamsJobGroups', 'streamsJobs', 'zenJobs']));
            await Streams.setInstances(instances);
            getStreamsExplorer().refreshInstancesView();
        }));

        // Add stored instances
        const storedInstances = Streams.getInstances();
        if (isLoggingEnabled()) {
            // eslint-disable-next-line no-console
            console.log('Stored Streams instances in extension state', storedInstances);
        }
        // Default instance not set, so set to the first one by default
        if (!Streams.getDefaultInstance() && storedInstances.length) {
            storedInstances[0].isDefault = true;
            await Streams.setInstances(storedInstances);
            Streams.setDefaultInstanceEnvContext();
            getStreamsExplorer().refreshInstancesView();
        }
        storedInstances.forEach((storedInstance: any) => {
            store.dispatch(Instance.addStreamsInstanceWithoutAuthentication(storedInstance))
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
        this._context.subscriptions.push(workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
            if (!event.affectsConfiguration(EXTENSION_ID)) {
                return;
            }

            if (event.affectsConfiguration(Settings.ENV_REFRESH_INTERVAL)) {
                const refreshSetting = Configuration.getSetting(Settings.ENV_REFRESH_INTERVAL);
                if (refreshSetting && typeof refreshSetting === 'number' && refreshSetting >= 1) {
                    store.dispatch(Editor.updateRefreshInterval(refreshSetting));
                }
            }

            if (event.affectsConfiguration(Settings.ENV_TIMEOUT_FOR_REQUESTS)) {
                const timeoutSetting = Configuration.getSetting(Settings.ENV_TIMEOUT_FOR_REQUESTS);
                if (timeoutSetting && typeof timeoutSetting === 'number' && timeoutSetting >= 1) {
                    StreamsRest.setRequestTimeout(timeoutSetting);
                }
            }

            if (event.affectsConfiguration(Settings.ENV_TOOLKIT_PATHS)) {
                const currentToolkitPathsSetting = Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS);
                this._toolkitPaths = currentToolkitPathsSetting !== '' && currentToolkitPathsSetting !== Settings.ENV_TOOLKIT_PATHS_DEFAULT ? currentToolkitPathsSetting : null;
                store.dispatch(EditorAction.setToolkitPathsSetting(this._toolkitPaths));
                commands.executeCommand(Commands.VIEW.STREAMS_EXPLORER.STREAMS_TOOLKITS.REFRESH_TOOLKITS, false);
            }
        }));
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
            const isRefreshingToolkits = EditorSelector.selectIsRefreshingToolkits(store.getState());
            const files = fs.readdirSync(TOOLKITS_CACHE_DIR).filter((file: any) => typeof file === 'string' && path.extname(file) === '.xml');
            const isEmpty = files.length === 0;
            if (!isRefreshingToolkits && isEmpty) {
                const message = 'The available content assist and toolkits may not match what is available on the Streams build service.';
                if (!Streams.getDefaultInstanceEnv()) {
                    window.showWarningMessage(
                        `${message} A default Streams instance has not been set.`,
                        'Set Default'
                    ).then((selection: string) => {
                        if (selection) {
                            window.showQuickPick(Streams.getQuickPickItems(Streams.getInstances()), {
                                canPickMany: false,
                                ignoreFocusOut: true,
                                placeHolder: 'Select a Streams instance to set as the default'
                            }).then(async (item: any): Promise<void> => {
                                if (item) {
                                    StreamsInstance.setDefaultInstance(item);
                                }
                            });
                        }
                        return null;
                    });
                } else {
                    const defaultInstance = Streams.getDefaultInstance();
                    const defaultIntanceName = InstanceSelector.selectInstanceName(store.getState(), defaultInstance.connectionId);
                    const defaultInstanceType = Streams.getDefaultInstanceEnv();
                    if ((defaultInstanceType === StreamsInstanceType.V5_CPD || defaultInstanceType === StreamsInstanceType.V5_STANDALONE) && !Authentication.isAuthenticated(defaultInstance)) {
                        window.showWarningMessage(
                            `${message} Authenticate to the ${defaultIntanceName} instance to update the available toolkits.`,
                            'Authenticate'
                        ).then((selection: string) => {
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
        if (activeTextEditor && activeTextEditor.document.languageId === LANGUAGE_SPL) {
            checkToolkitsCache();
        }
    }

    /**
     * Handle build/submit action based on number of instances
     * @param type                           the action type
     * @param zeroInstancesCallbackFn        function to execute when there are no instances
     * @param oneInstanceCallbackFn          function to execute when there is one instance
     * @param multipleInstancesCallbackFn    function to execute when there are multiple instances
     */
    private static handleAction(type: string, zeroInstancesCallbackFn: Function, oneInstanceCallbackFn: Function, multipleInstancesCallbackFn: Function): void {
        const storedInstances = Streams.getInstances();
        if (!storedInstances.length) {
            const notificationButtons = [{
                label: 'Add Instance',
                callbackFn: () => {
                    const queuedActionId = generateRandomId('queuedAction');
                    store.dispatch(EditorAction.addQueuedAction({
                        id: queuedActionId,
                        action: Editor.executeCallbackFn(zeroInstancesCallbackFn)
                    }));
                    StreamsInstance.authenticate(null, false, queuedActionId);
                }
            }];
            this._defaultMessageHandler.handleInfo(`There are no Streams instances available. Add an instance to continue with the ${type}.`, { notificationButtons });
        } else if (storedInstances.length === 1) {
            oneInstanceCallbackFn();
        } else {
            multipleInstancesCallbackFn();
        }
    }

    /**
     * Show instance selection webview panel
     * @param action             The build and/or submit action
     * @param filePaths          The selected file paths
     * @param postBuildAction    The post-build action
     */
    private static showInstancePanel(action: string, filePaths: string[], postBuildAction: any): void {
        commands.executeCommand(Commands.ENVIRONMENT.SHOW_INSTANCE_WEBVIEW_PANEL, action, filePaths, postBuildAction);
    }

    /**
     * Initialize a Streams build
     * @param type        The build type (from SPL file or Makefile)
     * @param filePath    The path to the SPL file or Makefile
     * @param action      The post-build action to take
     */
    private static async initBuild(type: string, filePath: string, action: PostBuildAction): Promise<any> {
        const workspaceFolders = _map(workspace.workspaceFolders, (folder: WorkspaceFolder) => folder.uri.fsPath);
        const appRoot = SourceArchiveUtils.getApplicationRoot(workspaceFolders, filePath);

        let lintHandler = Registry.getLintHandler(appRoot);
        if (!lintHandler) {
            lintHandler = new LintHandler(appRoot);
            Registry.addLintHandler(appRoot, lintHandler);
        }

        let compositeToBuild: string;
        let messageHandlerId: string;
        if (type === 'buildApp') {
            const { namespace, mainComposites }: any = StreamsUtils.getFqnMainComposites(filePath);
            compositeToBuild = await this.getCompositeToBuild(namespace, mainComposites);
            messageHandlerId = `${appRoot}:${compositeToBuild}`;
        } else {
            messageHandlerId = filePath;
        }

        let messageHandler = Registry.getMessageHandler(messageHandlerId);
        if (!messageHandler) {
            messageHandler = new MessageHandler({ appRoot, filePath });
            Registry.addMessageHandler(messageHandlerId, messageHandler);
        }

        const displayPath = this.getDisplayPath(appRoot, filePath);
        Logger.registerOutputChannel(filePath, displayPath);

        let statusMessage: string;
        if (type === 'buildApp') {
            statusMessage = `Received request to build${action === PostBuildAction.Submit ? ' and submit.' : '.'}`;
        } else {
            statusMessage = `Received request to build from a Makefile${action === PostBuildAction.Submit ? ' and submit.' : '.'}`;
        }
        messageHandler.handleInfo(statusMessage, { showNotification: false });
        messageHandler.handleInfo(`Selected: ${filePath}`, { showNotification: false });

        if (type === 'buildApp') {
            return { appRoot, compositeToBuild, messageHandler };
        }
        return { appRoot, messageHandler };
    }

    /**
     * Initialize a Streams job submission
     * @param filePaths    The paths to the application bundle(s)
     */
    private static initSubmit(filePaths: string[]): string[] {
        const bundleFilePaths = filePaths.filter((filePath: string) => filePath.toLowerCase().endsWith('.sab'));

        const statusMessage = `Received request to submit application bundle${bundleFilePaths.length > 1 ? 's.' : '.'}`;
        this._defaultMessageHandler.handleInfo(statusMessage, { showNotification: false });
        this._defaultMessageHandler.handleInfo(`Selected:\n${bundleFilePaths.join('\n')}`, { showNotification: false });

        return bundleFilePaths;
    }

    /**
     * Get the main composite to build. Prompt the user to select if
     * there are multiple composites defined and there is no Makefile.
     * @param namespace     The defined namespace
     * @param composites    The defined composites
     */
    private static async getCompositeToBuild(namespace: string, composites: string[]): Promise<string> {
        if (composites.length === 1) {
            return namespace === '' ? composites[0] : `${namespace}::${composites[0]}`;
        }

        return window.showQuickPick(composites, {
            ignoreFocusOut: true,
            placeHolder: 'Select the main composite to build...'
        }).then((composite: string) => {
            if (composite) {
                return namespace === '' ? composite : `${namespace}::${composite}`;
            }
            throw new Error('Build canceled, a main composite was not selected');
        });
    }

    private static handleError(err: any, messageHandler: MessageHandler, errorMsg: string): void {
        messageHandler.handleError(
            errorMsg,
            { detail: err.response || err.message || err, stack: err.response || err.stack }
        );
    }
}
