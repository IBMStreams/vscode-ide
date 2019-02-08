'use strict';

import { ExtensionContext } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';

import { SplLanguageClient } from './languageClient';
import { initialize as initCommands } from './commands';
import { initialize as initUtils } from './utils';

let client: LanguageClient;

export function activate(context: ExtensionContext): void {
    client = SplLanguageClient.create(context);

    initUtils(context, client);
    initCommands(context);
}

export function deactivate(): Thenable<void> {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
