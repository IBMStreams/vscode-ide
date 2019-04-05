import { ExtensionContext } from 'vscode';
import { Commands, IBaseCommand } from '.';
import StreamsBuild from '../build';

/**
 * Command that opens a link in a web browser
 */
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
                StreamsBuild.openStreamingAnalyticsConsole();
                break;
            case Commands.OPEN_CLOUD_DASHBOARD:
                StreamsBuild.openCloudDashboard();
                break;
            case Commands.OPEN_STREAMS_CONSOLE:
                StreamsBuild.openStreamsConsole();
                break;
            case Commands.OPEN_ICP4D_DASHBOARD:
                StreamsBuild.openIcp4dDashboard();
                break;
        }
    }
}
