import { commands, ExtensionContext } from 'vscode';
import { Commands } from '../commands';
import ICP4DWebviewPanel from './icp4d';

export { default as ICP4DWebviewPanel } from './icp4d';

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

/**
 * Generate a nonce to whitelist which scripts can be run
 */
export function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
