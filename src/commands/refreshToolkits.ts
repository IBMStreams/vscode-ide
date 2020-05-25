import { ExtensionContext } from 'vscode';
import { Commands, BaseCommand } from '.';
import StreamsBuild from '../build';

/**
 * Command that allows a user to refresh the toolkits on the SPL LSP server
 */
export default class RefreshToolkitsCommand implements BaseCommand {
    public commandName: string = Commands.ENVIRONMENT.TOOLKITS_REFRESH;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): any {
        StreamsBuild.refreshToolkits();
    }
}
