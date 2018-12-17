'use strict';

import { ExtensionContext } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';

import { SplConfig, SplLinter, SplLogger } from '.';

export * from './build';
export * from './config';
export * from './linter';
export * from './logger';
export * from './settings';
export * from './spl-build-common';

/**
 * Initialize utilities
 * @param context    The extension context
 * @param client     The language client
 */
export function initialize(context: ExtensionContext, client: LanguageClient) {
    SplConfig.configure(context, client);
    SplLinter.configure(context);
    SplLogger.configure(context);
}
