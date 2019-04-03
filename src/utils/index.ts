import { ExtensionContext } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { SplConfig, SplLinter, SplLogger } from '.';

export * from './config';
export * from './constants';
export * from './keychain';
export * from './linter';
export * from './logger';
export * from './settings';

/**
 * Initialize utilities
 * @param context    The extension context
 * @param client     The language client
 */
export function initialize(context: ExtensionContext, client: LanguageClient) {
    SplConfig.configure(context);
    SplLinter.configure(context);
    SplLogger.configure();
}
