import { Registry } from '@ibmstreams/common';
import { window } from 'vscode';
import { Commands, BaseCommand } from '.';
import { EXTENSION_NAME, LANGUAGE_SERVER, Logger } from '../utils';

/**
 * Command that allows a user to remove build output channels
 */
export default class RemoveOutputChannelsCommand implements BaseCommand {
  public commandName: string = Commands.GENERAL.REMOVE_OUTPUT_CHANNELS;

  /**
   * Execute the command
   */
  public execute(): any {
    Registry.getDefaultMessageHandler().logInfo(
      'Received request to remove build output channels.'
    );
    const channels = Logger.outputChannels;
    const channelObjs = Object.keys(channels).map((key) => channels[key]);
    const channelNames = channelObjs
      .filter(
        (channel) =>
          channel.displayName !== EXTENSION_NAME &&
          channel.displayName !== LANGUAGE_SERVER
      )
      .map((channel) => channel.displayName);
    if (!channelNames.length) {
      Registry.getDefaultMessageHandler().logInfo(
        'There are no channels to remove.',
        { showNotification: true }
      );
      return null;
    }

    return window
      .showQuickPick(channelNames, {
        canPickMany: true,
        ignoreFocusOut: true,
        placeHolder: 'Select the build output channels to remove...'
      })
      .then((selected) => {
        if (selected) {
          const selectedChannelObjs = channelObjs.filter(
            (channel) => selected.indexOf(channel.displayName) > -1
          );
          selectedChannelObjs.forEach((obj) => {
            obj.outputChannel.dispose();
            const channelName = Object.keys(channels).find(
              (key) => channels[key].displayName === obj.displayName
            );
            if (channelName) {
              delete channels[channelName];
            }
          });
          Registry.getDefaultMessageHandler().logInfo(
            `Removed build output channels: ${JSON.stringify(selected)}`
          );
        }
      });
  }
}
