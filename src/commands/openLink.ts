import { ExtensionContext } from 'vscode';
import { SplBuild } from '../build';
import { IBaseCommand } from './base';
import { Commands } from './commands';

export class OpenLinkCommand implements IBaseCommand {
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
        switch (this.commandName) {
            case Commands.OPEN_STREAMING_ANALYTICS_CONSOLE:
                SplBuild.openStreamingAnalyticsConsole();
                break;
            case Commands.OPEN_CLOUD_DASHBOARD:
                SplBuild.openCloudDashboard();
                break;
            case Commands.OPEN_STREAMS_CONSOLE:
                SplBuild.openStreamsConsole();
                break;
            case Commands.OPEN_ICP4D_DASHBOARD:
                SplBuild.openIcp4dDashboard();
                break;
        }
    }
}
