import { IBM_CLOUD_DASHBOARD_URL, InstanceSelector, store, StreamsInstanceType } from '@streams/common';
import { commands, ExtensionContext, Uri } from 'vscode';
import { Commands, BaseCommand } from '.';
import { Streams } from '../streams';
import { BuiltInCommands, Logger } from '../utils';

/**
 * Command that opens a link in a web browser
 */
export default class OpenLinkCommand implements BaseCommand {
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
    public execute(context: ExtensionContext, ...args: any[]): void {
        const defaultInstance = Streams.checkDefaultInstance();
        if (!defaultInstance) {
            return;
        }
        switch (this.commandName) {
            case Commands.ENVIRONMENT.CPD_OPEN_CONSOLE:
                this._openStreamsCpdConsole(defaultInstance);
                break;
            case Commands.ENVIRONMENT.CPD_OPEN_DASHBOARD:
                this._openCpdDashboard(defaultInstance);
                break;
            case Commands.ENVIRONMENT.STREAMS_STANDALONE_OPEN_CONSOLE:
                this._openStreamsStandaloneConsole(defaultInstance);
                break;
            case Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_CONSOLE:
                this._openStreamingAnalyticsConsole(defaultInstance);
                break;
            case Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_DASHBOARD:
                this._openCloudDashboard(defaultInstance);
                break;
            default:
                break;
        }
    }

    /**
     * Open a URL in a browser
     * @param url         The URL to open
     * @param callback    The callback function
     */
    private _openUrl(url: string, callback?: () => void): Thenable<void> {
        return commands.executeCommand(BuiltInCommands.Open, Uri.parse(url)).then(() => callback && callback());
    }

    /**
     * Open IBM Streams Console
     * @param defaultInstance    The default instance
     * @param name               The Streams name
     */
    private _openStreamsConsole(defaultInstance: any, name: string): void {
        try {
            const consoleUrl = InstanceSelector.selectConsoleUrl(store.getState(), defaultInstance.connectionId);
            this._openUrl(
                consoleUrl,
                () => Logger.info(null, `Opened IBM ${name} Console: ${consoleUrl}`)
            );
        } catch (error) {
            Logger.error(null, `Error opening IBM ${name} Console.`, true);
            if (error.stack) {
                Logger.error(null, error.stack);
            }
        }
    }

    /**
     * Open IBM Streams Console for Cloud Pak for Data deployments
     * @param defaultInstance    The default instance
     */
    private _openStreamsCpdConsole(defaultInstance: any): void {
        if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V5_CPD) {
            this._openStreamsConsole(defaultInstance, 'Streams');
        }
    }

    /**
     * Open IBM Cloud Pak for Data Dashboard
     * @param defaultInstance    The default instance
     */
    private _openCpdDashboard(defaultInstance: any): void {
        if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V5_CPD) {
            try {
                const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(store.getState(), defaultInstance.connectionId);
                const cpdDashboardUrl = `${cpdUrl}/zen/#/homepage`;
                this._openUrl(
                    cpdDashboardUrl,
                    () => Logger.info(null, `Opened IBM Cloud Pak for Data Dashboard: ${cpdDashboardUrl}`)
                );
            } catch (error) {
                Logger.error(null, 'Error opening IBM Cloud Pak for Data Dashboard.', true);
                if (error.stack) {
                    Logger.error(null, error.stack);
                }
            }
        }
    }

    /**
     * Open IBM Streams Console for Streams Standalone deployments
     * @param defaultInstance    The default instance
     */
    private _openStreamsStandaloneConsole(defaultInstance: any): void {
        if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V5_STANDALONE) {
            this._openStreamsConsole(defaultInstance, 'Streams');
        }
    }

    /**
     * Open IBM Streaming Analytics Console
     * @param defaultInstance    The default instance
     */
    private _openStreamingAnalyticsConsole(defaultInstance: any): void {
        if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V4_STREAMING_ANALYTICS) {
            this._openStreamsConsole(defaultInstance, 'Streaming Analytics');
        }
    }

    /**
     * Open IBM Cloud Dashboard
     * @param defaultInstance    The default instance
     */
    private _openCloudDashboard(defaultInstance: any): void {
        if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V4_STREAMING_ANALYTICS) {
            try {
                this._openUrl(
                    IBM_CLOUD_DASHBOARD_URL,
                    () => Logger.info(null, `Opened IBM Cloud Dashboard: ${IBM_CLOUD_DASHBOARD_URL}`)
                );
            } catch (error) {
                Logger.error(null, 'Error opening IBM Cloud Dashboard.', true);
                if (error.stack) {
                    Logger.error(null, error.stack);
                }
            }
        }
    }
}
