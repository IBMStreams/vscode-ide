import { PostBuildAction } from '@ibmstreams/common';
import { commands, ExtensionContext } from 'vscode';
import {
    BuildCommand,
    CreateApplicationCommand,
    BaseCommand,
    ListToolkitsCommand,
    OpenLinkCommand,
    RefreshToolkitsCommand,
    RemoveOutputChannelsCommand,
    SetConfigSettingCommand,
    ShowJobGraphCommand,
    ShowSubmitJobDialogCommand
} from '.';
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
export { default as ShowJobGraphCommand } from './showJobGraph';
export { default as ShowSubmitJobDialogCommand } from './showJobSubmitDialog';
export { Commands };

/**
 * Register commands
 * @param context    The extension context
 */
export function initialize(context: ExtensionContext): void {
    const streamsCommands = new Array<BaseCommand>();
    streamsCommands.push(new CreateApplicationCommand());
    streamsCommands.push(new RemoveOutputChannelsCommand());
    streamsCommands.push(new BuildCommand(Commands.BUILD.APP_DOWNLOAD, PostBuildAction.Download));
    streamsCommands.push(new BuildCommand(Commands.BUILD.APP_SUBMIT, PostBuildAction.Submit));
    streamsCommands.push(new BuildCommand(Commands.BUILD.MAKE_DOWNLOAD, PostBuildAction.Download));
    streamsCommands.push(new BuildCommand(Commands.BUILD.MAKE_SUBMIT, PostBuildAction.Submit));
    streamsCommands.push(new BuildCommand(Commands.BUILD.SUBMIT));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.CPD_OPEN_CONSOLE));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.CPD_OPEN_DASHBOARD));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_CONSOLE));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_DASHBOARD));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.STREAMS_STANDALONE_OPEN_CONSOLE));
    streamsCommands.push(new ShowJobGraphCommand());
    streamsCommands.push(new ShowSubmitJobDialogCommand());
    streamsCommands.push(new SetConfigSettingCommand(Commands.ENVIRONMENT.TOOLKIT_PATHS_SET));
    streamsCommands.push(new RefreshToolkitsCommand());
    streamsCommands.push(new ListToolkitsCommand());

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
