import {
    BuildSelector, getStreamsInstance, InstanceSelector, Registry, store
} from '@ibmstreams/common';
import * as fs from 'fs';
import _cloneDeep from 'lodash/cloneDeep';
import _isEqual from 'lodash/isEqual';
import _has from 'lodash/has';
import * as os from 'os';
import * as path from 'path';
import {
    commands, ExtensionContext, Uri, ViewColumn, WebviewPanel, window
} from 'vscode';
import { getNonce } from '..';
import { BuiltInCommands } from '../../utils';
import BaseWebviewPanel from '../base';

interface IRequestMessage<T> {
    req: string;
    command: string;
    args: T;
}

interface IReplyMessage {
    seq?: string;
    err?: any;
    res?: any;
}

interface IBuildImageProperties {
    name: string;
    details: any;
    buildCallbackFn: Function;
    targetInstance: any;
}

enum DetailProperty {
    BundlePath = 'bundlePath',
    BuildArtifact = 'buildArtifact',
    BaseImage = 'baseImage',
    ApplicationCredentials = 'applicationCredentials'
}

/**
 * Manages the webview panel for configuring an edge application image build
 */
export default class ConfigureImageBuildWebviewPanel extends BaseWebviewPanel {
    public static panels = [];
    public static id = 0;
    public static panelsReady = {};
    private static readonly _location = ViewColumn.Active;
    private static readonly _titlePrefix = 'Build Edge Application Image';
    private static readonly _viewType = 'configureImageBuild';
    private _currentPanel: ConfigureImageBuildWebviewPanel | undefined;
    private _id: number;
    private _properties: any;

    /**
     * @param panel         The webview panel
     * @param context       The extension context
     * @param properties    The edge application image build properties
     */
    private constructor(
        panel: WebviewPanel,
        context: ExtensionContext,
        properties: IBuildImageProperties
    ) {
        super(panel, context);

        this._id = ++ConfigureImageBuildWebviewPanel.id;
        this._properties = properties;

        ConfigureImageBuildWebviewPanel.panelsReady[this._id] = false;

        this.setHtml();
        this.receiveMessage();
    }

    /**
     * Create or show the webview
     * @param context       The extension context
     * @param properties    The edge application image build properties
     */
    public static createOrShow(context: ExtensionContext, properties: IBuildImageProperties): void {
        // Show panel if it already exists
        const matchFn = (panel: ConfigureImageBuildWebviewPanel): boolean => panel._properties.details[DetailProperty.BundlePath] === properties.details[DetailProperty.BundlePath]
            && _isEqual(panel._properties.details[DetailProperty.BuildArtifact], properties.details[DetailProperty.BuildArtifact])
            && _isEqual(panel._properties.details[DetailProperty.BaseImage], properties.details[DetailProperty.BaseImage])
            && panel._properties.targetInstance.connectionId === properties.targetInstance.connectionId;
        const existingPanel = this.panels.find(matchFn);
        if (existingPanel) {
            existingPanel._currentPanel.panel.reveal(this._location);
            return;
        }

        const title = properties && properties.name
            ? `${this._titlePrefix}: ${properties.name.length > 30 ? `${properties.name.substring(0, 29)}...` : properties.name}`
            : this._titlePrefix;
        const panel = super.createWebview(context, this._location, title, this._viewType, { retainContextWhenHidden: true });
        const configureImageBuildPanel = new ConfigureImageBuildWebviewPanel(panel, context, properties);
        configureImageBuildPanel._setCurrentPanel(configureImageBuildPanel);
        this.panels.push(configureImageBuildPanel);
    }

    protected dispose(): void {
        ConfigureImageBuildWebviewPanel.panels = ConfigureImageBuildWebviewPanel.panels.filter((panel: ConfigureImageBuildWebviewPanel) => panel._currentPanel._id !== this._id);
        this._currentPanel = undefined;
    }

    protected async setHtml(): Promise<void> {
        let content = fs.readFileSync(path.join(this.extensionPath, 'dist', 'webviews', 'configureImageBuild.html'), 'utf8');
        const nonce = getNonce();
        content = content.replace(/{{nonce}}/g, nonce);

        const mainScriptPathOnDisk = Uri.file(path.join(this.context.extensionPath, 'dist', 'webviews', 'configureImageBuild.js'));
        const mainScriptUri = this.panel.webview.asWebviewUri(mainScriptPathOnDisk).toString();
        content = content
            .replace(/{{webviewCspSource}}/g, this.panel.webview.cspSource)
            .replace('{{mainScriptUri}}', mainScriptUri);

        // Set parameters to pass as props for the main container
        const newProperties = _cloneDeep(this._properties);
        delete newProperties.details[DetailProperty.BaseImage];
        newProperties.preselectedBaseImage = this._properties.details[DetailProperty.BaseImage] || null;
        const paramsStr = `const params = ${JSON.stringify(newProperties)};`;
        content = content.replace('{{init}}', paramsStr);

        this.panel.webview.html = content;

        // Check if the webview is ready within five seconds
        setTimeout(() => {
            const isReady = ConfigureImageBuildWebviewPanel.panelsReady[this._id];
            if (!isReady) {
                // Dispose the panel
                this._currentPanel.panel.dispose();
                // Re-create the webview
                ConfigureImageBuildWebviewPanel.createOrShow(this._context, this._properties);
            }
        }, 5000);
    }

    protected receiveMessage(): void {
        this.panel.webview.onDidReceiveMessage((message: IRequestMessage<any>) => {
            switch (message.command) {
                case 'webview-ready':
                    ConfigureImageBuildWebviewPanel.panelsReady[this._id] = true;
                    return null;
                case 'close-panel':
                    return this._handleClosePanelMessage(message);
                case 'get-base-images':
                    return this._getBaseImages(message);
                case 'browse-for-buildconfig-json':
                    return this._browseForBuildConfigJson(message);
                case 'create-sample-buildconfig-json':
                    return this._createSampleBuildConfigJson(message);
                case 'build-image':
                    return this._buildImage(message);
                default:
                    break;
            }
            return null;
        }, null, this.disposables);
    }

    /**
     * Set the current instance Selection panel
     * @param panel    The current panel
     */
    private _setCurrentPanel(panel: ConfigureImageBuildWebviewPanel): void {
        this._currentPanel = panel;
    }

    /**
     * Close the webview panel if it exists
     */
    private _close(): void {
        if (this._currentPanel) {
            this._currentPanel.panel.dispose();
        }
    }

    /**
     * Send a reply message to the webview
     * @param originalMessage    The original JSON message sent from the webview
     * @param message            The message to send to the webview
     */
    private _replyMessage(originalMessage: IRequestMessage<any>, message: any): void {
        const reply: IReplyMessage = {
            seq: originalMessage.req,
            res: message
        };
        this.panel.webview.postMessage(reply);
    }

    /**
     * Handle a close panel message
     * @param message    The JSON message sent from the webview
     */
    private _handleClosePanelMessage(message: IRequestMessage<any>): void {
        this._close();
    }

    /**
     * Get base images
     * @param message    The JSON message sent from the webview
     */
    private async _getBaseImages(message: IRequestMessage<any>): Promise<void> {
        const { connectionId } = this._properties.targetInstance;
        await store.dispatch(getStreamsInstance(connectionId, false, false));
        const baseImages = InstanceSelector.selectBaseImages(store.getState(), connectionId);
        this._replyMessage(message, baseImages);
    }

    /**
     * Browse for an edge application image build configuration file
     * @param message    The JSON message sent from the webview
     */
    private _browseForBuildConfigJson(message: IRequestMessage<any>): Thenable<any> {
        const dirPath = this._getDirPath();
        const options = {
            canSelectMany: false,
            defaultUri: Uri.file(dirPath),
            filters: { JSON: ['json'] },
            openLabel: 'Select'
        };
        return window.showOpenDialog(options).then((uris: Uri[]) => {
            if (uris && uris.length) {
                const [selectedConfig] = uris;
                const configFilePath = selectedConfig.fsPath;
                try {
                    const json = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
                    if (_has(json, 'baseImage') && _has(json, 'image')) {
                        this._replyMessage(message, {
                            filePath: configFilePath,
                            error: null,
                            errorLink: false
                        });
                    } else {
                        this._replyMessage(message, {
                            filePath: configFilePath,
                            error: 'Not a valid edge application image build configuration file. Learn more ',
                            errorLink: true
                        });
                    }
                } catch (err) {
                    const error = `Not valid JSON.${err && err.message ? ` ${err.message.trim()}` : ''}`;
                    this._replyMessage(message, {
                        filePath: configFilePath,
                        error: error.endsWith('.') ? error : `${error}.`,
                        errorLink: false
                    });
                }
            }
        });
    }

    /**
     * Create a sample edge application image build configuration file
     * @param message    The JSON message sent from the webview
     */
    private async _createSampleBuildConfigJson(message: IRequestMessage<any>): Promise<void> {
        const { args } = message;
        if (args) {
            const { baseImage, imageName, imageTag } = args;
            const configContent = this._getSampleBuildConfigJsonContent(baseImage, imageName, imageTag);
            if (configContent) {
                const dirPath = this._getDirPath();
                const options = {
                    defaultUri: Uri.file(path.join(dirPath, 'buildconfig.json')),
                    filters: { JSON: ['json'] },
                    saveLabel: 'Create'
                };
                return window.showSaveDialog(options).then((uri: Uri) => {
                    if (uri) {
                        if (fs.existsSync(uri.fsPath)) {
                            fs.unlinkSync(uri.fsPath);
                        }
                        fs.writeFileSync(uri.fsPath, JSON.stringify(configContent, null, 2));
                        commands.executeCommand(BuiltInCommands.Open, uri);

                        this._replyMessage(message, uri.fsPath);
                    }
                });
            }
        }
    }

    /**
     * Build edge application image given the configuration file path
     * @param message    The JSON message sent from the webview
     */
    private async _buildImage(message: IRequestMessage<any>): Promise<void> {
        const { args } = message;
        if (args) {
            const {
                configFilePath, shouldOverrideExistingAppBundles, baseImage, imageName, imageTag
            } = args;

            const bundlePath = this._getProperty(DetailProperty.BundlePath);
            const buildArtifact = this._getProperty(DetailProperty.BuildArtifact);
            let messageHandler = Registry.getDefaultMessageHandler();
            let bundleName = null;
            let tmpConfigFilePath = null;
            if (bundlePath) {
                messageHandler = Registry.getMessageHandler(bundlePath);
                bundleName = path.basename(bundlePath);
            } else if (buildArtifact) {
                const { buildId, name } = buildArtifact;
                const identifier = BuildSelector.selectBuildMessageHandlerIdentifier(store.getState(), buildId, this._properties.targetInstance.connectionId);
                if (identifier) {
                    messageHandler = Registry.getMessageHandler(identifier);
                }
                bundleName = name;
            }

            // Override applicationBundles property
            if (configFilePath && shouldOverrideExistingAppBundles) {
                try {
                    const configContent = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
                    const application = bundlePath ? path.basename(bundlePath) : buildArtifact.applicationBundle;
                    const applicationCredentials = this._getProperty(DetailProperty.ApplicationCredentials);
                    configContent.applicationBundles = [{
                        application,
                        ...(buildArtifact && { applicationCredentials })
                    }];
                    tmpConfigFilePath = this._writeBuildConfigJson(bundleName, configContent);
                } catch (err) {
                    if (messageHandler) {
                        const instanceName = InstanceSelector.selectInstanceName(store.getState(), this._properties.targetInstance.connectionId);
                        const message = `Failed to build an image for the application ${bundleName} using the Streams instance ${instanceName}.`;
                        messageHandler.handleError(message, { detail: err && err.message ? `Not valid JSON.\n${err.message.trim()}` : 'Not valid JSON.' });
                    }
                }
            }

            // Create the edge application image build configuration file if the user selected the Simple configuration type
            if (baseImage && imageName && imageTag) {
                const configContent = this._getSampleBuildConfigJsonContent(baseImage, imageName, imageTag);
                if (configContent) {
                    tmpConfigFilePath = this._writeBuildConfigJson(this._properties.name, configContent);
                }
            }

            if (messageHandler) {
                const message = configFilePath
                    ? `Using the image build configuration file: ${configFilePath}.`
                    : `Using the image build configuration properties:\n- Base image: ${baseImage.id}\n- Image name: ${imageName}\n- Image tag: ${imageTag}`
                messageHandler.handleInfo(message, { showNotification: false });
            }

            this._properties.buildCallbackFn(tmpConfigFilePath || configFilePath);
        }
        this._close();
    }

    /**
     * Get directory path to use for finding and saving the edge application image build configuration file
     */
    private _getDirPath(): string {
        const bundlePath = this._getProperty(DetailProperty.BundlePath);
        const buildArtifact = this._getProperty(DetailProperty.BuildArtifact);
        if (bundlePath) {
            return path.dirname(bundlePath);
        } else if (buildArtifact) {
            const { buildId } = buildArtifact;
            return BuildSelector.selectBuildAppRoot(store.getState(), buildId, this._properties.targetInstance.connectionId);
        }
        return os.homedir();
    }

    /**
     * Get property
     */
    private _getProperty(prop: DetailProperty): any {
        const { details } = this._properties;
        if (details && _has(details, prop)) {
            return details[prop] || null;
        }
        return null;
    }

    /**
     * Generate the content for the sample edge application image build configuration file
     * @param baseImage    The base image
     * @param imageName    The image name
     * @param imageTag     The image tag
     */
    private _getSampleBuildConfigJsonContent(baseImage: any, imageName: string, imageTag: string): any {
        const bundlePath = this._getProperty(DetailProperty.BundlePath);
        const buildArtifact = this._getProperty(DetailProperty.BuildArtifact);
        if (bundlePath || buildArtifact) {
            const application = bundlePath ? path.basename(bundlePath) : buildArtifact.applicationBundle;
            const applicationCredentials = this._getProperty(DetailProperty.ApplicationCredentials);
            const { id, registry, prefix } = baseImage;
            return {
                applicationBundles: [{
                    application,
                    ...(buildArtifact && { applicationCredentials })
                }],
                baseImage: id,
                image: `${registry}/${prefix}/${imageName}:${imageTag}`
            };
        }
        return null;
    }

    /**
     * Write the edge application image build configuration JSON file to disk
     * @param bundleName       The application bundle name
     * @param configContent    The edge application image build configuration JSON content
     */
    private _writeBuildConfigJson(bundleName: string, configContent: any): string {
        const tmpConfigFilePath = path.join(os.tmpdir(), `.buildconfig_${bundleName.replace('::', '.')}_${Date.now()}.json`);
        if (fs.existsSync(tmpConfigFilePath)) {
            fs.unlinkSync(tmpConfigFilePath);
        }
        fs.writeFileSync(tmpConfigFilePath, JSON.stringify(configContent, null, 2));
        return tmpConfigFilePath
    }
}
