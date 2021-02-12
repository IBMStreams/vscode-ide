import { EditorCommand, Registry } from '@ibmstreams/common';
import { commands, env, ExtensionContext, Uri } from 'vscode';
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';
import StreamsBuild from './build';
import MessageHandler from './build/MessageHandler';
import { Commands, initialize as initCommands } from './commands';
import SplLanguageClient from './languageClient';
import { Streams } from './streams';
import { initialize as initUtils, Keychain, VSCode } from './utils';
import { initialize as initTreeViews } from './views';
import { initialize as initWebviews } from './webviews';

function initRegistry(): void {
  const defaultMessageHandler = new MessageHandler(null);
  Registry.setDefaultMessageHandler(defaultMessageHandler);
  Registry.setSystemKeychain(Keychain);
  const openUrlHandler = (url: string, callback?: () => void): Thenable<void> =>
    env.openExternal(Uri.parse(url)).then(() => callback && callback());
  Registry.setOpenUrlHandler(openUrlHandler);
  const sendLspNotificationHandler = (param: object): void =>
    SplLanguageClient.getClient().sendNotification(
      DidChangeConfigurationNotification.type.method,
      param
    );
  Registry.setSendLspNotificationHandler(sendLspNotificationHandler);
  const copyToClipboardHandler = (text: string): Thenable<void> =>
    VSCode.copyToClipboard(text);
  Registry.setCopyToClipboardHandler(copyToClipboardHandler);
  const executeCommandHandler = (
    name: EditorCommand,
    args: any[]
  ): Thenable<any> => {
    let commandName = null;
    if (name === EditorCommand.REFRESH_TOOLKITS) {
      commandName =
        Commands.VIEW.STREAMS_EXPLORER.STREAMS_TOOLKITS.REFRESH_TOOLKITS;
    } else if (name === EditorCommand.SET_TOOLKIT_PATHS_SETTING) {
      commandName = Commands.ENVIRONMENT.TOOLKIT_PATHS_SET;
    }
    return commandName
      ? commands.executeCommand(commandName, ...args)
      : Promise.reject();
  };
  Registry.setExecuteCommandHandler(executeCommandHandler);
  const showJobGraphHandler = (properties: object): Thenable<void> =>
    commands.executeCommand(Commands.ENVIRONMENT.SHOW_JOB_GRAPH, properties);
  Registry.setShowJobGraphHandler(showJobGraphHandler);
  const showJobSubmitDialogHandler = (opts: object): Thenable<void> =>
    commands.executeCommand(Commands.BUILD.CONFIGURE_JOB_SUBMISSION, opts);
  Registry.setShowJobSubmitHandler(showJobSubmitDialogHandler);
  const showImageBuildHandler = (opts: object): Thenable<void> =>
    commands.executeCommand(Commands.BUILD.CONFIGURE_IMAGE_BUILD, opts);
  Registry.setShowImageBuildHandler(showImageBuildHandler);
}

/**
 * Called when the extension is activated
 * @param context the extension context
 */
export async function activate(context: ExtensionContext): Promise<void> {
  initUtils(context);
  initCommands(context);
  initTreeViews(context);
  initWebviews(context);
  Streams.initialize(context);
  initRegistry();
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
