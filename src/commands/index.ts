'use strict';

import { commands, ExtensionContext } from 'vscode';

import { BaseCommand, BuildCommand, Commands, CreateApplicationCommand, OpenLinkCommand, RemoveOutputChannelsCommand, SetConfigSettingCommand } from '.';
import { SplLogger, SplBuilder } from '../utils'

export * from './base';
export * from './build';
export * from './commands';
export * from './createApplication';
export * from './openLink';
export * from './removeOutputChannels';
export * from './setConfigSetting';

/**
 * Register commands
 * @param context    The extension context
 */
export function initialize(context: ExtensionContext) {
    const streamsCommands = new Array<BaseCommand>();
    streamsCommands.push(new SetConfigSettingCommand(Commands.SET_SERVICE_CREDENTIALS));
    streamsCommands.push(new SetConfigSettingCommand(Commands.SET_TOOLKITS_PATH));
    streamsCommands.push(new BuildCommand(Commands.BUILD_DOWNLOAD, SplBuilder.BUILD_ACTION.DOWNLOAD));
    streamsCommands.push(new BuildCommand(Commands.BUILD_SUBMIT, SplBuilder.BUILD_ACTION.SUBMIT));
    streamsCommands.push(new BuildCommand(Commands.BUILD_MAKE_DOWNLOAD, SplBuilder.BUILD_ACTION.DOWNLOAD));
    streamsCommands.push(new BuildCommand(Commands.BUILD_MAKE_SUBMIT, SplBuilder.BUILD_ACTION.SUBMIT));
    streamsCommands.push(new BuildCommand(Commands.SUBMIT));
    streamsCommands.push(new CreateApplicationCommand());
    streamsCommands.push(new OpenLinkCommand(Commands.OPEN_STREAMING_ANALYTICS_CONSOLE));
    streamsCommands.push(new OpenLinkCommand(Commands.OPEN_CLOUD_DASHBOARD));
    streamsCommands.push(new RemoveOutputChannelsCommand());

    streamsCommands.forEach(command => {
        context.subscriptions.push(commands.registerCommand(command.commandName, (...args) => {
            const executionResult = command.execute(context, args)
            if (executionResult && executionResult.catch) {
                executionResult.catch(error => {
                    SplLogger.error(null, `An error occurred while executing command: ${command.commandName}`);
                    if (error && error.stack) {
                        SplLogger.error(null, error.stack);
                    }
                });
            }
        }));
    });
}
