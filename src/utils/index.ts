import { EditorAction, Logger as StreamsLogger, store } from '@streams/common';
import { env, ExtensionContext } from 'vscode';
import { Configuration, Diagnostics, Logger } from '.';
import * as Settings from './settings';
import State from './state';

export { default as Authentication } from './authentication';
export { default as Configuration } from './configuration';
export * from './constants';
export { default as Diagnostics } from './diagnostics';
export { default as Keychain } from './keychain';
export { default as Logger } from './logger';
export { default as VSCode } from './vscode';
export { Settings, State };

/**
 * Initialize utilities
 * @param context    The extension context
 */
export function initialize(context: ExtensionContext): void {
    Configuration.configure(context);
    Diagnostics.configure(context);
    Logger.configure();

    if (isLoggingEnabled()) {
        store.dispatch(EditorAction.setIsLoggingEnabled(true));
        StreamsLogger.enable();
    } else {
        store.dispatch(EditorAction.setIsLoggingEnabled(false));
        StreamsLogger.disable();
    }
}

/**
 * Determine whether the extension is being debugged or not
 */
export function inDebugMode(): boolean {
    const { sessionId, machineId } = env;
    return sessionId === 'someValue.sessionId' || machineId === 'someValue.machineId';
}

/**
 * Determine if logging is enabled
 */
export function isLoggingEnabled(): boolean {
    return inDebugMode() || Configuration.getSetting(Settings.LOG_LEVEL) === Settings.LOG_LEVEL_VALUE.DEBUG
}
