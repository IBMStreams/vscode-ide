'use strict';

import { window, ExtensionContext } from 'vscode';

import { BaseCommand } from './base';
import { Commands } from './commands';
import { SplLogger } from '../utils';

export class RemoveOutputChannelsCommand implements BaseCommand {
    commandName: string = Commands.REMOVE_OUTPUT_CHANNELS;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    execute(context: ExtensionContext, ...args: any[]): any {
        SplLogger.info(null, 'Received request to remove build output channels');
        const channels = SplLogger._outputChannels;
        const channelObjs = Object.keys(channels).map(key => channels[key]);
        const channelNames = channelObjs.filter(channel => channel.displayName !== 'IBM Streams').map(channel => channel.displayName);
        if (!channelNames.length) {
            SplLogger.info(null, 'There are no channels to remove', true, true);
        } else {
            return window.showQuickPick(channelNames, {
                canPickMany: true,
                ignoreFocusOut: true,
                placeHolder: 'Select the build output channels to remove...'
            }).then(selected => {
                if (selected) {
                    const selectedChannelObjs = channelObjs.filter(channel => selected.indexOf(channel.displayName) > -1);
                    selectedChannelObjs.forEach(obj => {
                        obj.outputChannel.dispose();
                        const channelName = Object.keys(channels).find(key => channels[key].displayName === obj.displayName);
                        if (channelName) {
                            delete channels[channelName];
                        }
                    });
                    SplLogger.info(null, `Removed build output channels: ${JSON.stringify(selected)}`);
                }
            });
        }
    }
}
