import { ExtensionContext } from 'vscode';
import { Commands, IBaseCommand } from '.';
import StreamsBuild from '../build';
import { Logger } from '../utils';

/**
 * Command that allows a user to refresh the toolkits on the SPL LSP server
 */
export class RefreshToolkitsCommand implements IBaseCommand {
    public commandName: string = Commands.REFRESH_TOOLKITS;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): any {
        Logger.info(null, 'Received request to refresh IBM Streams toolkits', false, true);
        StreamsBuild.refreshLspToolkits();
    }
}
