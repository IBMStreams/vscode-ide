import { env, ExtensionContext } from 'vscode';
import { Configuration, Diagnostics, Logger } from '.';
import * as Constants from './constants';
import * as Settings from './settings';

export { default as Configuration } from './configuration';
export { default as Diagnostics } from './diagnostics';
export { default as Keychain } from './keychain';
export { default as Logger } from './logger';
export { Constants, Settings };

/**
 * Initialize utilities
 * @param context    The extension context
 * @param client     The language client
 */
export function initialize(context: ExtensionContext): void {
    Configuration.configure(context);
    Diagnostics.configure(context);
    Logger.configure();
}

/**
 * Determine whether the extension is being debugged or not
 */
export function inDebugMode(): boolean {
    const { sessionId, machineId } = env;
    return sessionId === 'someValue.sessionId' || machineId === 'someValue.machineId';
}
