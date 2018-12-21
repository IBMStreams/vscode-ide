'use strict';

import { commands, ExtensionContext, Uri } from 'vscode';

import { BaseCommand } from './base';
import { Commands } from './commands';
import { Settings, SplBuilder, SplConfig, SplLogger } from '../utils';

export class OpenLinkCommand implements BaseCommand {
    /**
     * Initialize the command
     * @param commandName    The name of the command
     */
    constructor(public commandName: string) {}

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    execute(context: ExtensionContext, ...args: any[]): void {
        const openUrlHandler = url => commands.executeCommand('vscode.open', Uri.parse(url));
        const builder = new SplBuilder(null, null, null, openUrlHandler, null);
        switch(this.commandName) {
            case Commands.OPEN_STREAMING_ANALYTICS_CONSOLE:
                const credentialsSetting = SplConfig.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS);
                const streamingAnalyticsCredentials = credentialsSetting ? JSON.stringify(credentialsSetting) : null;
                builder.openStreamingAnalyticsConsole(streamingAnalyticsCredentials);
                SplLogger.info(null, 'Opened Streaming Analytics Console');
                break;
            case Commands.OPEN_CLOUD_DASHBOARD: {
                builder.openCloudDashboard();
                SplLogger.info(null, 'Opened IBM Cloud Dashboard');
                break;
            }
        }
    }
}
