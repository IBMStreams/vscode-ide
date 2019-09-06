import { commands, ExtensionContext } from 'vscode';
import {
    BuildCommand,
    CreateApplicationCommand,
    BaseCommand,
    ListToolkitsCommand,
    OpenLinkCommand,
    RefreshToolkitsCommand,
    RemoveOutputChannelsCommand,
    SetConfigSettingCommand
} from '.';
import { StreamsUtils } from '../build/v5/util';
import { Logger } from '../utils';
import * as Commands from './commands';

export { default as BuildCommand } from './build';
export { default as CreateApplicationCommand } from './createApplication';
export { default as BaseCommand } from './base';
export { default as ListToolkitsCommand } from './listToolkits';
export { default as OpenLinkCommand } from './openLink';
export { default as RefreshToolkitsCommand } from './refreshToolkits';
export { default as RemoveOutputChannelsCommand } from './removeOutputChannels';
export { default as SetConfigSettingCommand } from './setConfigSetting';
export { Commands };

/**
 * Register commands
 * @param context    The extension context
 */
export function initialize(context: ExtensionContext): void {
    const streamsCommands = new Array<BaseCommand>();
    streamsCommands.push(new BuildCommand(Commands.BUILD_APP_DOWNLOAD, StreamsUtils.BUILD_ACTION.DOWNLOAD));
    streamsCommands.push(new BuildCommand(Commands.BUILD_APP_SUBMIT, StreamsUtils.BUILD_ACTION.SUBMIT));
    streamsCommands.push(new BuildCommand(Commands.BUILD_MAKE_DOWNLOAD, StreamsUtils.BUILD_ACTION.DOWNLOAD));
    streamsCommands.push(new BuildCommand(Commands.BUILD_MAKE_SUBMIT, StreamsUtils.BUILD_ACTION.SUBMIT));
    streamsCommands.push(new BuildCommand(Commands.SUBMIT));
    streamsCommands.push(new CreateApplicationCommand());
    streamsCommands.push(new ListToolkitsCommand());
    streamsCommands.push(new OpenLinkCommand(Commands.OPEN_CLOUD_DASHBOARD));
    streamsCommands.push(new OpenLinkCommand(Commands.OPEN_ICP4D_DASHBOARD));
    streamsCommands.push(new OpenLinkCommand(Commands.OPEN_STREAMING_ANALYTICS_CONSOLE));
    streamsCommands.push(new OpenLinkCommand(Commands.OPEN_STREAMS_CONSOLE));
    streamsCommands.push(new RefreshToolkitsCommand());
    streamsCommands.push(new RemoveOutputChannelsCommand());
    streamsCommands.push(new SetConfigSettingCommand(Commands.SET_ICP4D_URL));
    streamsCommands.push(new SetConfigSettingCommand(Commands.SET_SERVICE_CREDENTIALS));
    streamsCommands.push(new SetConfigSettingCommand(Commands.SET_TARGET_VERSION));
    streamsCommands.push(new SetConfigSettingCommand(Commands.SET_TOOLKITS_PATH));

    streamsCommands.forEach((command: BaseCommand) => {
        context.subscriptions.push(commands.registerCommand(command.commandName, (...args) => {
            const executionResult = command.execute(context, args);
            if (executionResult && executionResult.catch) {
                executionResult.catch((error) => {
                    Logger.error(null, `An error occurred while executing command: ${command.commandName}`);
                    if (error && error.stack) {
                        Logger.error(null, error.stack);
                    }
                });
            }
            return executionResult;
        }));
    });
}
