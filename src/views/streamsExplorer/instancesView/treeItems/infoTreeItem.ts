import { StreamsInstanceType } from '@ibmstreams/common';
import * as path from 'path';
import { Command, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { TreeItemType } from '.';

/**
 * Tree item that represents information
 */
export default class InfoTreeItem extends TreeItem {
    public type = TreeItemType.Info;
    public children = null;

    constructor(
        private _extensionPath: string,
        public label: string,
        private _commandName?: string,
        private _commandArg?: any
    ) {
        super(label, TreeItemCollapsibleState.None);
    }

    public contextValue = 'infoInstanceTreeItem';

    public iconPath = {
        light: path.join(this._extensionPath, 'images', 'icons', 'light', 'information.svg'),
        dark: path.join(this._extensionPath, 'images', 'icons', 'dark', 'information.svg')
    };

    public get command(): Command {
        return this._commandName ? {
            title: '',
            command: this._commandName,
            arguments: this._commandArg ? [this._commandArg] : null
        } : null;
    }

    public get tooltip(): string {
        if (this._commandArg && this._commandArg.connectionId) {
            let tooltip: string;
            const { instanceType, authentication } = this._commandArg;
            switch (instanceType) {
                case StreamsInstanceType.V5_CPD:
                    tooltip = `Cloud Pak for Data URL:\n${authentication.cpdUrl}`;
                    tooltip += `\n\nCloud Pak for Data version: ${authentication.cpdVersion.substring(1)}`;
                    tooltip += `\n\nCloud Pak for Data username:\n${authentication.username}`;
                    break;
                case StreamsInstanceType.V5_STANDALONE:
                    tooltip = `Streams REST service URL:\n${authentication.streamsRestServiceUrl}`;
                    tooltip += authentication.streamsBuildServiceUrl
                        ? `\n\nStreams build service URL:\n${authentication.streamsBuildServiceUrl}`
                        : '';
                    tooltip += authentication.streamsSecurityServiceUrl
                        ? `\n\nStreams security service URL:\n${authentication.streamsSecurityServiceUrl}`
                        : '';
                    tooltip += `\n\nStreams username:\n${authentication.username}`;
                    break;
                case StreamsInstanceType.V4_STREAMING_ANALYTICS:
                    tooltip = `Streaming Analytics service V2 REST URL:\n${authentication.credentials.v2_rest_url}`;
                    break;
                default:
                    tooltip = null;
                    break;
            }
            return tooltip;
        }
        return null;
    }
}
