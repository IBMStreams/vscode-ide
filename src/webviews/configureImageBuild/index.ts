import {
  BuildSelector,
  InstanceSelector,
  Registry,
  store
} from '@ibmstreams/common';
import * as fs from 'fs';
import _cloneDeep from 'lodash/cloneDeep';
import _isEqual from 'lodash/isEqual';
import _has from 'lodash/has';
import * as os from 'os';
import * as path from 'path';
import {
  commands,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window
} from 'vscode';
import { BuiltInCommands } from '../../utils';
import { BaseWebviewPanel, RequestMessage, WebviewType } from '../base';

/**
 * Message command identifier
 */
enum MessageCommand {
  ClosePanel = 'close-panel',
  GetBaseImages = 'get-base-images',
  BrowseForBuildConfigJson = 'browse-for-buildconfig-json',
  CreateSampleBuildConfigJson = 'create-sample-buildconfig-json',
  BuildImage = 'build-image'
}

interface BuildImageProperties {
  name: string;
  details: any;
  preselectedBaseImage: any;
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
export default class ConfigureImageBuildPanel extends BaseWebviewPanel {
  public static panels: ConfigureImageBuildPanel[] = [];
  public static panelIdCounter = 0;
  private static readonly type = WebviewType.ConfigureImageBuild;
  private static readonly titlePrefix = 'Build Edge Application Image';

  /**
   * @param panel the webview panel
   * @param context the extension context
   * @param properties the edge application image build properties
   */
  private constructor(
    panel: WebviewPanel,
    context: ExtensionContext,
    private properties: BuildImageProperties
  ) {
    super(panel, context);
    this.currentPanelId = ++ConfigureImageBuildPanel.panelIdCounter;
    this.setHtml();
  }

  /**
   * Create or show the webview
   * @param context the extension context
   * @param properties the edge application image build properties
   */
  public static createOrShow(
    context: ExtensionContext,
    properties: BuildImageProperties
  ): void {
    // Show panel if it already exists
    const matchFn = (panel: ConfigureImageBuildPanel): boolean =>
      panel.properties.details[DetailProperty.BundlePath] ===
        properties.details[DetailProperty.BundlePath] &&
      _isEqual(
        panel.properties.details[DetailProperty.BuildArtifact],
        properties.details[DetailProperty.BuildArtifact]
      ) &&
      _isEqual(
        panel.properties.details[DetailProperty.BaseImage],
        properties.details[DetailProperty.BaseImage]
      ) &&
      panel.properties.targetInstance.connectionId ===
        properties.targetInstance.connectionId;
    const existingPanel = this.panels.find(matchFn);
    if (existingPanel) {
      existingPanel.currentPanel.panel.reveal(ViewColumn.Active);
      return;
    }

    const title =
      properties && properties.name
        ? `${this.titlePrefix}: ${
            properties.name.length > 30
              ? `${properties.name.substring(0, 29)}...`
              : properties.name
          }`
        : this.titlePrefix;
    const panel = super.createWebview(context.extensionPath, this.type, title);
    const configureImageBuildPanel = new ConfigureImageBuildPanel(
      panel,
      context,
      properties
    );
    configureImageBuildPanel.setCurrentPanel(configureImageBuildPanel);
    this.panels.push(configureImageBuildPanel);
  }

  protected dispose(): void {
    ConfigureImageBuildPanel.panels = ConfigureImageBuildPanel.panels.filter(
      (panel: ConfigureImageBuildPanel) =>
        panel.currentPanel.currentPanelId !== this.currentPanelId
    );
    this.currentPanel = undefined;
    super.dispose();
  }

  protected async setHtml(): Promise<void> {
    const params = _cloneDeep(this.properties);
    delete params.details[DetailProperty.BaseImage];
    params.preselectedBaseImage =
      this.properties.details[DetailProperty.BaseImage] || null;
    super.setHtml(params);
  }

  protected handleMessage(message: RequestMessage<any>): any {
    switch (message.command) {
      case MessageCommand.ClosePanel:
        return this.handleClosePanelMessage();
      case MessageCommand.GetBaseImages:
        return this.getBaseImages(message);
      case MessageCommand.BrowseForBuildConfigJson:
        return this.browseForBuildConfigJson(message);
      case MessageCommand.CreateSampleBuildConfigJson:
        return this.createSampleBuildConfigJson(message);
      case MessageCommand.BuildImage:
        return this.buildImage(message);
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
   * Get base images
   * @param message the JSON message sent from the webview
   */
  private async getBaseImages(message: RequestMessage<any>): Promise<void> {
    const { connectionId } = this.properties.targetInstance;
    const baseImages = InstanceSelector.selectBaseImages(
      store.getState(),
      connectionId
    );
    super.replyMessage(message, baseImages);
  }

  /**
   * Browse for an edge application image build configuration file
   * @param message the JSON message sent from the webview
   */
  private browseForBuildConfigJson(
    message: RequestMessage<any>
  ): Thenable<any> {
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
            super.replyMessage(message, {
              filePath: configFilePath,
              error: null,
              errorLink: false
            });
          } else {
            super.replyMessage(message, {
              filePath: configFilePath,
              error:
                'Not a valid edge application image build configuration file. Learn more ',
              errorLink: true
            });
          }
        } catch (err) {
          const error = `Not valid JSON.${
            err && err.message ? ` ${err.message.trim()}` : ''
          }`;
          super.replyMessage(message, {
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
   * @param message the JSON message sent from the webview
   */
  private async createSampleBuildConfigJson(
    message: RequestMessage<any>
  ): Promise<void> {
    const { args } = message;
    if (args) {
      const { baseImage, imageName, imageTag } = args;
      const configContent = this._getSampleBuildConfigJsonContent(
        baseImage,
        imageName,
        imageTag
      );
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
            fs.writeFileSync(
              uri.fsPath,
              JSON.stringify(configContent, null, 2)
            );
            commands.executeCommand(BuiltInCommands.Open, uri);

            super.replyMessage(message, uri.fsPath);
          }
        });
      }
    }
  }

  /**
   * Build edge application image given the configuration file path
   * @param message the JSON message sent from the webview
   */
  private async buildImage(message: RequestMessage<any>): Promise<void> {
    const { args } = message;
    if (args) {
      const {
        configFilePath,
        shouldOverrideExistingAppBundles,
        baseImage,
        imageName,
        imageTag
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
        const identifier = BuildSelector.selectBuildMessageHandlerIdentifier(
          store.getState(),
          buildId,
          this.properties.targetInstance.connectionId
        );
        if (identifier) {
          messageHandler = Registry.getMessageHandler(identifier);
        }
        bundleName = name;
      }

      // Override applicationBundles property
      if (configFilePath && shouldOverrideExistingAppBundles) {
        try {
          const configContent = JSON.parse(
            fs.readFileSync(configFilePath, 'utf8')
          );
          const application = bundlePath
            ? path.basename(bundlePath)
            : buildArtifact.applicationBundle;
          const applicationCredentials = this._getProperty(
            DetailProperty.ApplicationCredentials
          );
          configContent.applicationBundles = [
            {
              application,
              ...(buildArtifact && { applicationCredentials })
            }
          ];
          tmpConfigFilePath = this._writeBuildConfigJson(
            bundleName,
            configContent
          );
        } catch (err) {
          if (messageHandler) {
            const instanceName = InstanceSelector.selectInstanceName(
              store.getState(),
              this.properties.targetInstance.connectionId
            );
            const message = `Failed to build an image for the application ${bundleName} using the Streams instance ${instanceName}.`;
            messageHandler.handleError(message, {
              detail:
                err && err.message
                  ? `Not valid JSON.\n${err.message.trim()}`
                  : 'Not valid JSON.'
            });
          }
        }
      }

      // Create the edge application image build configuration file if the user selected the Simple configuration type
      if (baseImage && imageName && imageTag) {
        const configContent = this._getSampleBuildConfigJsonContent(
          baseImage,
          imageName,
          imageTag
        );
        if (configContent) {
          tmpConfigFilePath = this._writeBuildConfigJson(
            this.properties.name,
            configContent
          );
        }
      }

      if (messageHandler) {
        const message = configFilePath
          ? `Using the image build configuration file: ${configFilePath}.`
          : `Using the image build configuration properties:\n- Base image: ${baseImage.id}\n- Image name: ${imageName}\n- Image tag: ${imageTag}`;
        messageHandler.handleInfo(message, { showNotification: false });
      }

      this.properties.buildCallbackFn(tmpConfigFilePath || configFilePath);
    }
    super.close(this.currentPanel);
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
      return BuildSelector.selectBuildAppRoot(
        store.getState(),
        buildId,
        this.properties.targetInstance.connectionId
      );
    }
    return os.homedir();
  }

  /**
   * Get property
   */
  private _getProperty(prop: DetailProperty): any {
    const { details } = this.properties;
    if (details && _has(details, prop)) {
      return details[prop] || null;
    }
    return null;
  }

  /**
   * Generate the content for the sample edge application image build configuration file
   * @param baseImage the base image
   * @param imageName the image name
   * @param imageTag the image tag
   */
  private _getSampleBuildConfigJsonContent(
    baseImage: any,
    imageName: string,
    imageTag: string
  ): any {
    const bundlePath = this._getProperty(DetailProperty.BundlePath);
    const buildArtifact = this._getProperty(DetailProperty.BuildArtifact);
    if (bundlePath || buildArtifact) {
      const application = bundlePath
        ? path.basename(bundlePath)
        : buildArtifact.applicationBundle;
      const applicationCredentials = this._getProperty(
        DetailProperty.ApplicationCredentials
      );
      const { id, registry, prefix } = baseImage;
      return {
        applicationBundles: [
          {
            application,
            ...(buildArtifact && { applicationCredentials })
          }
        ],
        baseImage: id,
        image: `${registry}/${prefix}/${imageName}:${imageTag}`
      };
    }
    return null;
  }

  /**
   * Write the edge application image build configuration JSON file to disk
   * @param bundleName the application bundle name
   * @param configContent the edge application image build configuration JSON content
   */
  private _writeBuildConfigJson(
    bundleName: string,
    configContent: any
  ): string {
    const tmpConfigFilePath = path.join(
      os.tmpdir(),
      `.buildconfig_${bundleName.replace('::', '.')}_${Date.now()}.json`
    );
    if (fs.existsSync(tmpConfigFilePath)) {
      fs.unlinkSync(tmpConfigFilePath);
    }
    fs.writeFileSync(tmpConfigFilePath, JSON.stringify(configContent, null, 2));
    return tmpConfigFilePath;
  }
}
