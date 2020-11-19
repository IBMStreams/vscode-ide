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
import { ConfigureJobSubmissionPanel } from '../webviews';

/**
 * Command that shows the Streams job submission dialog webview
 */
export default class ShowSubmitJobDialogCommand implements BaseCommand {
  public commandName: string = Commands.BUILD.CONFIGURE_JOB_SUBMISSION;

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
      const showJobSubmitDialog = (): void => {
        ConfigureJobSubmissionPanel.createOrShow(context, properties);
      };
      if (!Authentication.isAuthenticated(targetInstance)) {
        const queuedActionId = generateRandomId('queuedAction');
        store.dispatch(
          EditorAction.addQueuedAction({
            id: queuedActionId,
            action: Editor.executeCallbackFn(showJobSubmitDialog)
          })
        );
        StreamsInstance.authenticate(targetInstance, true, queuedActionId);
      } else {
        showJobSubmitDialog();
      }
    }
  }
}
