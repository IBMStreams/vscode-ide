import * as path from 'path';
import { commands, extensions } from 'vscode';

export const EXTENSION_PUBLISHER = 'IBM';
export const EXTENSION_ID = 'ibm-streams';
export const EXTENSION_QUALIFIED_ID = `${EXTENSION_PUBLISHER}.${EXTENSION_ID}`;
export const EXTENSION_NAME = 'IBM Streams';
export const TOOLKITS_CACHE_DIR = `${
  extensions.getExtension(EXTENSION_QUALIFIED_ID).extensionPath
}${path.sep}toolkitsCache`;
export const LANGUAGE_SPL = 'spl';
export const LANGUAGE_SERVER = 'IBM Streams SPL Language Server';
export const SPL_APPLICATION_KEY = 'applicationPath';
export const DOC_BASE_URL = 'https://ibmstreams.github.io/vscode-ide';

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
  StreamsAppServices = 'streamsAppServices',
  StreamsJobs = 'streamsJobs',
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
  BuildPrimitiveOperator = 'build-primitive-operator',
  BuildMake = 'build-make',
  BuildToolkit = 'build-toolkit',
  MakeCppPrimitiveOperator = 'make-c++-primitive-operator',
  Submit = 'submit',
  SubmitCpd = 'submit-cpd',
  UploadBundleCpd = 'upload-bundle-cpd'
}

/**
 * Set extension context
 * @param key the context key
 * @param value the context value
 */
export function setContext(key: string, value: any): Thenable<void> {
  return commands.executeCommand(BuiltInCommands.SetContext, key, value);
}

/**
 * Java primitive operator processing pattern
 */
export enum JavaPrimitiveOperatorProcessingPattern {
  Source = 'source',
  Process = 'process',
  Sink = 'sink'
}

/**
 * Primitive operator properties
 */
export interface PrimitiveOperatorProperties {
  projectFolderPath: string;
  namespace: string;
  name: string;
  genericOperator?: boolean;
  processingPattern?: JavaPrimitiveOperatorProcessingPattern;
}

/**
 * Cloud Pak for Data job run running states
 */
export const CpdJobRunRunningStates = ['Running'];

/**
 * Cloud Pak for Data job run finished states
 */
export const CpdJobRunFinishedStates = ['Completed', 'Failed', 'Canceled'];
