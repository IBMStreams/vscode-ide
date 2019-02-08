'use strict';

import { commands, window, ExtensionContext, Uri } from 'vscode';

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
        const openUrlHandler = (url: string) => commands.executeCommand('vscode.open', Uri.parse(url));
        const builder = new SplBuilder(null, null, null, openUrlHandler, null);
        switch(this.commandName) {
            case Commands.OPEN_STREAMING_ANALYTICS_CONSOLE:
                const openConsole = (credentialsSetting: any) => {
                    const streamingAnalyticsCredentials = credentialsSetting ? JSON.stringify(credentialsSetting) : null;
                    builder.openStreamingAnalyticsConsole(streamingAnalyticsCredentials);
                    SplLogger.info(null, 'Opened Streaming Analytics Console');
                }

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

                break;
            case Commands.OPEN_CLOUD_DASHBOARD: {
                builder.openCloudDashboard();
                SplLogger.info(null, 'Opened IBM Cloud Dashboard');
                break;
            }
        }
    }
}
