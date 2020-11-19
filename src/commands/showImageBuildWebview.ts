import {
  Editor,
  EditorAction,
  generateRandomId,
  store
} from '@ibmstreams/common';
import { ExtensionContext } from 'vscode';
import { BaseCommand, Commands } from '.';
import { StreamsInstance } from '../streams';
import { Authentication } from '../utils';
import { ConfigureImageBuildPanel } from '../webviews';

/**
 * Command that shows the Streams edge application image build webview
 */
export default class ShowImageBuildWebviewCommand implements BaseCommand {
  public commandName: string = Commands.BUILD.CONFIGURE_IMAGE_BUILD;

  /**
   * Execute the command
   * @param context the extension context
   * @param args array of arguments
   */
  public execute(context: ExtensionContext, ...args: any[]): void {
    const properties = args[0][0] ? args[0][0] : null;
    const targetInstance =
      properties && properties.targetInstance
        ? properties.targetInstance
        : null;
    if (targetInstance) {
      const showImageBuildWebview = (): void => {
        ConfigureImageBuildPanel.createOrShow(context, properties);
      };
      if (!Authentication.isAuthenticated(targetInstance)) {
        const queuedActionId = generateRandomId('queuedAction');
        store.dispatch(
          EditorAction.addQueuedAction({
            id: queuedActionId,
            action: Editor.executeCallbackFn(showImageBuildWebview)
          })
        );
        StreamsInstance.authenticate(targetInstance, true, queuedActionId);
      } else {
        showImageBuildWebview();
      }
    }
  }
}
