import { commands, ExtensionContext } from 'vscode';
import { Commands } from '../commands';
import StreamsAuthenticationWebviewPanel from './streamsAuthentication';
import InstanceSelectionWebviewPanel from './instanceSelection';

export { default as ConfigureJobSubmissionWebviewPanel } from './configureJobSubmission';
export { default as JobGraphWebviewPanel } from './jobGraph';
export { default as StreamsAuthenticationWebviewPanel } from './streamsAuthentication';
export { default as InstanceSelectionWebviewPanel } from './instanceSelection';

/**
 * Initialize utilities
 * @param context    The extension context
 * @param client     The language client
 */
export function initialize(context: ExtensionContext): void {
    context.subscriptions.push(commands.registerCommand(Commands.ENVIRONMENT.SHOW_AUTHENTICATION_WEBVIEW_PANEL, (existingInstance: any, queuedActionId: string) => {
        StreamsAuthenticationWebviewPanel.createOrShow(context, existingInstance, queuedActionId);
    }));

    context.subscriptions.push(commands.registerCommand(Commands.ENVIRONMENT.SHOW_INSTANCE_WEBVIEW_PANEL, (action: string, filePaths: string[], postBuildAction: any) => {
        InstanceSelectionWebviewPanel.createOrShow(context, action, filePaths, postBuildAction);
    }));
}

/**
 * Generate a nonce to allow which scripts can be run
 */
export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i += 1) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
