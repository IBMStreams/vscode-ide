import { ExtensionContext } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { initialize as initBuild, SplBuild } from './build';
import { initialize as initCommands } from './commands';
import { SplLanguageClient } from './languageClient';
import { initialize as initUtils } from './utils';
import { initialize as initWebviews } from './webviews';

let client: LanguageClient;

export async function activate(context: ExtensionContext): Promise<void> {
    SplBuild.configure(context);

    client = await SplLanguageClient.create(context);

    initUtils(context, client);
    initBuild();
    initCommands(context);
    initWebviews(context);
}

export function deactivate(): Thenable<void> {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
