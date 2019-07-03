import { ExtensionContext, window } from 'vscode';
import { Commands, BaseCommand } from '.';
import { Constants, Logger } from '../utils';

/**
 * Command that allows a user to remove build output channels
 */
export default class RemoveOutputChannelsCommand implements BaseCommand {
    public commandName: string = Commands.REMOVE_OUTPUT_CHANNELS;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): any {
        Logger.info(null, 'Received request to remove build output channels');
        const channels = Logger.outputChannels;
        const channelObjs = Object.keys(channels).map((key) => channels[key]);
        const channelNames = channelObjs.filter((channel) => channel.displayName !== Constants.IBM_STREAMS).map((channel) => channel.displayName);
        if (!channelNames.length) {
            Logger.info(null, 'There are no channels to remove', true, true);
            return null;
        }

        return window.showQuickPick(channelNames, {
            canPickMany: true,
            ignoreFocusOut: true,
            placeHolder: 'Select the build output channels to remove...'
        }).then((selected) => {
            if (selected) {
                const selectedChannelObjs = channelObjs.filter((channel) => selected.indexOf(channel.displayName) > -1);
                selectedChannelObjs.forEach((obj) => {
                    obj.outputChannel.dispose();
                    const channelName = Object.keys(channels).find((key) => channels[key].displayName === obj.displayName);
                    if (channelName) {
                        delete channels[channelName];
                    }
                });
                Logger.info(null, `Removed build output channels: ${JSON.stringify(selected)}`);
            }
        });
    }
}
