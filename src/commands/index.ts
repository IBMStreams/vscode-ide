'use strict';

import { commands, ExtensionContext } from 'vscode';

import { BaseCommand, BuildCommand, Commands, CreateApplicationCommand, SetConfigSettingCommand } from '.';
import { SplLogger, SplBuilder } from '../utils'

export * from './base';
export * from './build';
export * from './commands';
export * from './createApplication';
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

    streamsCommands.forEach(command => {
        context.subscriptions.push(commands.registerCommand(command.commandName, (...args) => {
            command.execute(context, args)
                .catch(error => {
                    SplLogger.error(null, `An error occurred while executing command: ${command.commandName}`);
                    if (error && error.stack) {
                        SplLogger.error(null, error.stack);
                    }
                    if (command.commandName.includes('ibm-streams.build')) {
                        SplLogger.error(null, 'Build failed', true, true);
                    }
                });
        }));
    });
}
