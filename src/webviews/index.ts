import { PrimitiveOperatorType } from '@ibmstreams/common';
import { commands, ExtensionContext } from 'vscode';
import { Commands } from '../commands';
import {
  CloudPakForDataAppServicePanel,
  EndpointPathAction
} from './cloudPakForDataAppService';
import {
  CloudPakForDataJobPanel,
  JobAction,
  JobArgs
} from './cloudPakForDataJob';
import CreatePrimitiveOperatorPanel from './createPrimitiveOperator';
import CreateSplApplicationPanel from './createSplApplication';
import CreateSplApplicationSetPanel from './createSplApplicationSet';
import InstanceSelectionPanel from './instanceSelection';
import StreamsAuthenticationPanel from './streamsAuthentication';

export * from './cloudPakForDataAppService';
export * from './cloudPakForDataJob';
export { default as ConfigureImageBuildPanel } from './configureImageBuild';
export { default as ConfigureJobSubmissionPanel } from './configureJobSubmission';
export { default as CreatePrimitiveOperatorPanel } from './createPrimitiveOperator';
export { default as CreateSplApplicationPanel } from './createSplApplication';
export { default as CreateSplApplicationSetPanel } from './createSplApplicationSet';
export { default as InstanceSelectionPanel } from './instanceSelection';
export { default as JobGraphPanel } from './jobGraph';
export { default as StreamsAuthenticationPanel } from './streamsAuthentication';

/**
 * Initialize utilities
 * @param context the extension context
 * @param client the language client
 */
export function initialize(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(
      Commands.ENVIRONMENT.SHOW_AUTHENTICATION_WEBVIEW_PANEL,
      (existingInstance: any, queuedActionId: string) => {
        StreamsAuthenticationPanel.createOrShow(
          context,
          existingInstance,
          queuedActionId
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      Commands.ENVIRONMENT.SHOW_INSTANCE_WEBVIEW_PANEL,
      (
        action: string,
        filePaths: string[],
        postBuildAction: any,
        args?: any
      ) => {
        InstanceSelectionPanel.createOrShow(
          context,
          action,
          filePaths,
          postBuildAction,
          args
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      Commands.ENVIRONMENT.SHOW_CPD_APP_SERVICE_PANEL,
      (
        connectionId: string,
        jobName: string,
        serviceApiUrl: string,
        serviceApi: any,
        serviceEndpointPath: string,
        serviceEndpointPathAction: EndpointPathAction
      ) => {
        CloudPakForDataAppServicePanel.createOrShow(
          context,
          connectionId,
          jobName,
          serviceApiUrl,
          serviceApi,
          serviceEndpointPath,
          serviceEndpointPathAction
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      Commands.ENVIRONMENT.SHOW_CPD_JOB_PANEL,
      (
        connectionId: string,
        jobAction: JobAction,
        args: JobArgs,
        resolve: Function
      ) => {
        CloudPakForDataJobPanel.createOrShow(
          context,
          connectionId,
          jobAction,
          args,
          resolve
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      Commands.GENERAL.SHOW_SPL_APPLICATION_WEBVIEW_PANEL,
      (folderPath: string, resolve: Function) => {
        CreateSplApplicationPanel.createOrShow(context, folderPath, resolve);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      Commands.GENERAL.SHOW_SPL_APPLICATION_SET_WEBVIEW_PANEL,
      (folderPath: string, resolve: Function) => {
        CreateSplApplicationSetPanel.createOrShow(context, folderPath, resolve);
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      Commands.GENERAL.SHOW_PRIMITIVE_OPERATOR_WEBVIEW_PANEL,
      (type: PrimitiveOperatorType, folderPath: string, resolve: Function) => {
        CreatePrimitiveOperatorPanel.createOrShow(
          context,
          type,
          folderPath,
          resolve
        );
      }
    )
  );
}

/**
 * Generate a nonce to allow which scripts can be run
 */
export function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
