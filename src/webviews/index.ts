import { commands, ExtensionContext } from 'vscode';
import { Commands } from '../commands';
import { ICP4DWebviewPanel } from './icp4d';

export * from './icp4d';

/**
 * Initialize utilities
 * @param context    The extension context
 * @param client     The language client
 */
export function initialize(context: ExtensionContext) {
    context.subscriptions.push(commands.registerCommand(Commands.SHOW_ICP4D_SETTINGS_WEBVIEW_PANEL, () => {
        ICP4DWebviewPanel.createOrShow(context);
    }));
}
