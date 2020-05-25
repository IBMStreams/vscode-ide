import { ExtensionContext } from 'vscode';
import { Commands, BaseCommand } from '.';
import StreamsBuild from '../build';

/**
 * Command that lists the available toolkits
 */
export default class ListToolkitsCommand implements BaseCommand {
    public commandName: string = Commands.ENVIRONMENT.TOOLKITS_LIST;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): any {
        StreamsBuild.listToolkits();
    }
}
