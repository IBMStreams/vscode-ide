import { InstanceSelector, store } from '@streams/common';
import _startCase from 'lodash/startCase';
import * as path from 'path';
import { commands, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { InfoTreeItem, JobGroupTreeItem, JobTreeItem } from '.';
import { Streams } from '../../../../streams';
import { BuiltInCommands, Logger } from '../../../../utils';

/**
 * Tree item that represents a Streams instance
 */
export default class InstanceTreeItem extends TreeItem {
    public type = 'instance';

    constructor(
        private _extensionPath: string,
        public instance: any,
        public children: (InfoTreeItem | JobGroupTreeItem | JobTreeItem)[],
    ) {
        super(instance.instanceName, instance.isDefault ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
    }

    public get contextValue(): string {
        const { connectionId } = this.instance;
        const instanceType = InstanceSelector.selectInstanceType(store.getState(), connectionId);
        const defaultValue = this.instance.isDefault ? 'default' : 'notDefault';
        const authenticatedValue = this._isAuthenticated() ? 'auth' : 'notAuth';
        const isConsoleEnabled = InstanceSelector.selectConsoleEnabled(store.getState(), connectionId) ? 'consoleEnabled_' : '';
        const treeItemType = 'instanceTreeItem';
        // Possible context values:
        // (default|notDefault)_(auth|notAuth)_(consoleEnabled_)v5_cpd_instanceTreeItem
        // (default|notDefault)_(auth|notAuth)_(consoleEnabled_)v5_standalone_instanceTreeItem
        // (default|notDefault)_(auth|notAuth)_(consoleEnabled_)v4_streamingAnalytics_instanceTreeItem
        return `${defaultValue}_${authenticatedValue}_${isConsoleEnabled}${instanceType}_${treeItemType}`;
    }

    public get description(): string {
        const status = this.instance.streamsInstance ? _startCase(this.instance.streamsInstance.status) : null;
        const versionLabel = Streams.getVersionLabel(this.instance.connectionId);
        if (versionLabel) {
            return status ? `${_startCase(status)} \u2022 ${versionLabel}` : versionLabel;
        }
        return null;
    }

    public get iconPath(): { dark: string, light: string } {
        // If the user is authenticated to the instance, then show a filled icon; otherwise, not filled
        let iconName = this._isAuthenticated() ? 'flash--filled' : 'flash';
        // If this is the default instance, then show the checked version of the icon
        if (this.instance.isDefault) {
            iconName += '--check';
        }
        return {
            dark: path.join(this._extensionPath, 'images', 'icons', 'dark', `${iconName}.svg`),
            light: path.join(this._extensionPath, 'images', 'icons', 'light', `${iconName}.svg`),
        };
    }

    public get tooltip(): string {
        const { instanceName } = this.instance;
        const versionLabel = Streams.getVersionLabel(this.instance.connectionId);
        return versionLabel ? `${instanceName}\n${versionLabel}` : versionLabel;
    }

    /**
     * Open IBM Cloud Pak for Data Instance Details page
     */
    public openCpdInstanceDetails(): void {
        try {
            if (this.instance) {
                const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(store.getState(), this.instance.connectionId);
                const serviceInstanceId = InstanceSelector.selectCloudPakForDataServiceInstanceId(store.getState(), this.instance.connectionId);
                const instanceDetailsUrl = `${cpdUrl}/streams/webpage/#/streamsDetails/streams-${serviceInstanceId}`;
                commands.executeCommand(BuiltInCommands.Open, Uri.parse(instanceDetailsUrl));
                return;
            }
            throw new Error();
        } catch (error) {
            Logger.error(null, 'Error opening IBM Cloud Pak for Data instance details page.', true);
            if (error.stack) {
                Logger.error(null, error.stack);
            }
        }
    }

    /**
     * Open Streams Console
     */
    public openStreamsConsole(): void {
        try {
            if (this.instance) {
                const consoleUrl = InstanceSelector.selectConsoleUrl(store.getState(), this.instance.connectionId);
                if (consoleUrl) {
                    commands.executeCommand(BuiltInCommands.Open, Uri.parse(consoleUrl));
                    return;
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
     * Check whether the user has authenticated to this instance
     */
    private _isAuthenticated(): boolean {
        const status = this.instance.streamsInstance ? this.instance.streamsInstance.status : null;
        return !!status;
    }
}
