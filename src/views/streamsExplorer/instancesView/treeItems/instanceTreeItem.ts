import {
  InstanceSelector,
  store,
  StreamsInstanceType
} from '@ibmstreams/common';
import _startCase from 'lodash/startCase';
import * as path from 'path';
import * as semver from 'semver';
import { env, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import {
  CpdJobTreeItem,
  InfoTreeItem,
  JobGroupTreeItem,
  JobTreeItem,
  LabelTreeItem,
  TreeItemType
} from '.';
import { CpdJob, Streams } from '../../../../streams';
import { Logger } from '../../../../utils';

/**
 * Tree item that represents a Streams instance
 */
export default class InstanceTreeItem extends TreeItem {
  public type = TreeItemType.Instance;

  constructor(
    private _extensionPath: string,
    public instance: any,
    public children: (
      | CpdJobTreeItem
      | InfoTreeItem
      | JobGroupTreeItem
      | JobTreeItem
      | LabelTreeItem
    )[]
  ) {
    super(
      instance.instanceName,
      instance.isDefault
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.Collapsed
    );

    // Set context value
    this.contextValue = this.getContextValue();

    // Set description
    this.description = this.getDescription();

    // Set icon path
    this.iconPath = this.getIconPath();

    // Set tooltip
    this.tooltip = this.getTooltip();
  }

  /**
   * Submit Job
   */
  public async submitJob(): Promise<void> {
    try {
      if (this.instance) {
        await CpdJob.submitJob(this.instance);
        return;
      }
      throw new Error();
    } catch (err) {
      CpdJob.handleError(err);
    }
  }

  /**
   * Open IBM Cloud Pak for Data Instance Details page
   */
  public async openCpdInstanceDetails(): Promise<boolean> {
    try {
      if (this.instance) {
        const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
          store.getState(),
          this.instance.connectionId
        );
        const serviceInstanceId = InstanceSelector.selectCloudPakForDataServiceInstanceId(
          store.getState(),
          this.instance.connectionId
        );
        const instanceDetailsUrl = `${cpdUrl}/streams/webpage/#/streamsDetails/streams-${serviceInstanceId}`;
        return env.openExternal(Uri.parse(instanceDetailsUrl));
      }
      throw new Error();
    } catch (error) {
      Logger.error(
        null,
        'Error opening IBM Cloud Pak for Data instance details page.',
        true
      );
      if (error.stack) {
        Logger.error(null, error.stack);
      }
    }
  }

  /**
   * Open Streams Console
   */
  public async openStreamsConsole(): Promise<boolean> {
    try {
      if (this.instance) {
        const consoleUrl = InstanceSelector.selectConsoleUrl(
          store.getState(),
          this.instance.connectionId
        );
        if (consoleUrl) {
          return env.openExternal(Uri.parse(consoleUrl));
        }
      }
      throw new Error();
    } catch (error) {
      Logger.error(null, 'Error opening IBM Streams Console.', true);
      if (error.stack) {
        Logger.error(null, error.stack);
      }
    }
  }

  /**
   * Get the context value
   */
  private getContextValue(): string {
    const { connectionId } = this.instance;
    const instanceType = InstanceSelector.selectInstanceType(
      store.getState(),
      connectionId
    );
    const defaultValue = this.instance.isDefault ? 'default' : 'notDefault';
    const authenticatedValue = this.isAuthenticated() ? 'auth' : 'notAuth';
    const isConsoleEnabled = InstanceSelector.selectConsoleEnabled(
      store.getState(),
      connectionId
    )
      ? 'consoleEnabled_'
      : '';
    const streamsVersion = InstanceSelector.selectStreamsVersion(
      store.getState(),
      connectionId,
      true
    );
    const hasCpdSpaces =
      instanceType === StreamsInstanceType.V5_CPD &&
      streamsVersion &&
      semver.gte(streamsVersion, '5.5.0')
        ? 'cpdSpaces_'
        : '';
    const treeItemType = 'instanceTreeItem';
    // Possible context values:
    // (default|notDefault)_(auth|notAuth)_(consoleEnabled_)(cpdSpaces_)v5_cpd_instanceTreeItem
    // (default|notDefault)_(auth|notAuth)_(consoleEnabled_)(cpdSpaces_)v5_standalone_instanceTreeItem
    // (default|notDefault)_(auth|notAuth)_(consoleEnabled_)(cpdSpaces_)v4_streamingAnalytics_instanceTreeItem
    return `${defaultValue}_${authenticatedValue}_${isConsoleEnabled}${hasCpdSpaces}${instanceType}_${treeItemType}`;
  }

  /**
   * Get the description
   */
  private getDescription(): string {
    const status = this.instance.streamsInstance
      ? _startCase(this.instance.streamsInstance.status)
      : null;
    const versionLabel = Streams.getVersionLabel(this.instance.connectionId);
    if (versionLabel) {
      return status
        ? `${_startCase(status)} \u2022 ${versionLabel}`
        : versionLabel;
    }
    return null;
  }

  /**
   * Get the icon path
   */
  private getIconPath(): { dark: string; light: string } {
    const iconsFolderPath = [this._extensionPath, 'images', 'icons'];
    // If the user is authenticated to the instance, then show a filled icon; otherwise, not filled
    let iconFileName = this.isAuthenticated() ? 'flash--filled' : 'flash';
    // If this is the default instance, then show the checked version of the icon
    if (this.instance.isDefault) {
      iconFileName += '--check';
    }
    return {
      light: path.join(...iconsFolderPath, 'light', `${iconFileName}.svg`),
      dark: path.join(...iconsFolderPath, 'dark', `${iconFileName}.svg`)
    };
  }

  /**
   * Get the tooltip
   */
  private getTooltip(): string {
    const { instanceName } = this.instance;
    const versionLabel = Streams.getVersionLabel(this.instance.connectionId);
    return versionLabel ? `${instanceName}\n${versionLabel}` : versionLabel;
  }

  /**
   * Check whether the user has authenticated to this instance
   */
  private isAuthenticated(): boolean {
    const status = this.instance.streamsInstance
      ? this.instance.streamsInstance.status
      : null;
    return !!status;
  }
}
