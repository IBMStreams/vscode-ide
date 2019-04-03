import { commands, ExtensionContext } from 'vscode';
import { refreshToolkits } from '../build/v5/actions';
import getStore from '../build/v5/redux-store/configure-store';
import StateSelector from '../build/v5/util/state-selectors';
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
        if (!StateSelector.hasAuthenticatedToStreamsInstance(getStore().getState()) || !StateSelector.hasAuthenticatedToStreamsInstance(getStore().getState())) {
            SplLogger.warn(null, 'You are not authenticated', true);
            commands.executeCommand(Commands.SHOW_ICP4D_SETTINGS_WEBVIEW_PANEL);
        } else {
            getStore().dispatch(refreshToolkits());
        }
    }
}
