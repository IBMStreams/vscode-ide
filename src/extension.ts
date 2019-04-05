import { ExtensionContext } from 'vscode';
import StreamsBuild from './build';
import { initialize as initCommands } from './commands';
import SplLanguageClient from './languageClient';
import { initialize as initUtils } from './utils';
import { initialize as initWebviews } from './webviews';

/**
 * Called when the extension is activated
 * @param context    The extension context
 */
export async function activate(context: ExtensionContext): Promise<void> {
    initUtils(context);
    initCommands(context);
    initWebviews(context);
    StreamsBuild.configure(context);

    await SplLanguageClient.create(context);
}

/**
 * Called when the extension is deactivated
 */
export function deactivate(): Thenable<void> {
    const client = SplLanguageClient.getClient();
    if (!client) {
        return undefined;
    }
    return client.stop();
}
