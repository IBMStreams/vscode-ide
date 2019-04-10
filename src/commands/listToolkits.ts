import { ExtensionContext } from 'vscode';
import { Commands, IBaseCommand } from '.';
import StreamsBuild from '../build';

/**
 * Command that lists the available toolkits
 */
export class ListToolkitsCommand implements IBaseCommand {
    public commandName: string = Commands.LIST_TOOLKITS;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): any {
        StreamsBuild.listToolkits();
    }
}
