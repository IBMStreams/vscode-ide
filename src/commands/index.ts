import { commands, ExtensionContext } from 'vscode';
import {
    BuildCommand,
    CreateApplicationCommand,
    IBaseCommand,
    ListToolkitsCommand,
    OpenLinkCommand,
    RefreshToolkitsCommand,
    RemoveOutputChannelsCommand,
    SetConfigSettingCommand
} from '.';
import { StreamsUtils } from '../build/v5/util';
import { Logger } from '../utils';
import * as Commands from './commands';

export { default as IBaseCommand } from './base';
export * from './build';
export * from './createApplication';
export * from './listToolkits';
export * from './openLink';
export * from './refreshToolkits';
export * from './removeOutputChannels';
export * from './setConfigSetting';
export { Commands };

/**
 * Register commands
 * @param context    The extension context
 */
export function initialize(context: ExtensionContext) {
    const streamsCommands = new Array<IBaseCommand>();
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

    streamsCommands.forEach((command: IBaseCommand) => {
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
        }));
    });
}
