import { ExtensionContext } from 'vscode';
import { SplBuild } from '../build';
import { SplLogger } from '../utils';
import { IBaseCommand } from './base';
import { Commands } from './commands';

export class RefreshToolkitsCommand implements IBaseCommand {
    public commandName: string = Commands.REFRESH_TOOLKITS;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): any {
        SplLogger.info(null, 'Received request to refresh IBM Streams toolkits', false, true);
        SplBuild.refreshLspToolkits();
    }
}
