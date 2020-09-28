import * as path from 'path';
import { commands, extensions } from 'vscode';

export const EXTENSION_PUBLISHER = 'IBM';
export const EXTENSION_ID = 'ibm-streams';
export const EXTENSION_QUALIFIED_ID = `${EXTENSION_PUBLISHER}.${EXTENSION_ID}`;
export const EXTENSION_NAME = 'IBM Streams';
export const TOOLKITS_CACHE_DIR = `${extensions.getExtension(EXTENSION_QUALIFIED_ID).extensionPath}${path.sep}toolkitsCache`;
export const LANGUAGE_SPL = 'spl';
export const LANGUAGE_SERVER = 'IBM Streams SPL Language Server';
export const SPL_APPLICATION_KEY = 'applicationPath';

/**
 * Built-in Visual Studio Code commands. See [documentation](https://code.visualstudio.com/api/references/commands).
 */
export enum BuiltInCommands {
    CloseAllEditors = 'workbench.action.closeAllEditors',
    Open = 'vscode.open',
    OpenFolder = 'vscode.openFolder',
    OpenSettings = 'workbench.action.openSettings',
    RevealFileInOS = 'revealFileInOS',
    SetContext = 'setContext',
    ShowViewContainer = 'workbench.view.extension',
    ShowView = 'focus'
}

/**
 * Command contexts
 */
export enum CommandContexts {
    ConsoleEnabled = 'consoleEnabled',
    DefaultInstanceEnv = 'defaultInstanceEnv'
}

/**
 * View containers
 */
export enum ViewContainers {
    StreamsExplorer = 'streams-explorer'
}

/**
 * Views
 */
export enum Views {
    StreamsDetails = 'streamsDetails',
    StreamsHelpfulResources = 'streamsHelpfulResources',
    StreamsInstances = 'streamsInstances',
    StreamsToolkits = 'streamsToolkits'
}

/**
 * Action type
 */
export enum ActionType {
    BuildApp = 'build',
    BuildImage = 'build-image',
    BuildMake = 'build-make',
    Submit = 'submit'
}

/**
 * Set extension context
 * @param key      The context key
 * @param value    The context value
 */
export function setContext(key: string, value: any): Thenable<void> {
    return commands.executeCommand(BuiltInCommands.SetContext, key, value);
}
