import { ExtensionContext } from 'vscode';
import StreamsBuild from './build';
import { initialize as initCommands } from './commands';
import SplLanguageClient from './languageClient';
import { Streams } from './streams';
import { initialize as initUtils } from './utils';
import { initialize as initTreeViews } from './views';
import { initialize as initWebviews } from './webviews';

/**
 * Called when the extension is activated
 * @param context    The extension context
 */
export async function activate(context: ExtensionContext): Promise<void> {
    initUtils(context);
    initCommands(context);
    initTreeViews(context);
    initWebviews(context);
    Streams.initialize(context);
    await StreamsBuild.configure(context);
    Streams.setDefaultInstanceEnvContext();

    await SplLanguageClient.initialize(context);
}

/**
 * Called when the extension is deactivated
 */
export function deactivate(): Thenable<void> {
    return SplLanguageClient.cleanUp();
}
