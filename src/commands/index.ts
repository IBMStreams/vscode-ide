import { PostBuildAction } from '@ibmstreams/common';
import { commands, ExtensionContext } from 'vscode';
import {
    AddSplApplicationCommand,
    BaseCommand,
    BuildCommand,
    BuildSplApplicationsCommand,
    CreateSplApplicationCommand,
    CreateSplApplicationSetCommand,
    ListToolkitsCommand,
    OpenLinkCommand,
    RefreshToolkitsCommand,
    RemoveOutputChannelsCommand,
    SetConfigSettingCommand,
    ShowImageBuildWebviewCommand,
    ShowJobGraphCommand,
    ShowSubmitJobDialogCommand
} from '.';
import { Logger } from '../utils';
import * as Commands from './commands';

export { default as AddSplApplicationCommand } from './addSplApplication';
export { default as BaseCommand } from './base';
export { default as BuildCommand } from './build';
export { default as BuildSplApplicationsCommand } from './buildSplApplications';
export { default as CreateSplApplicationCommand } from './createSplApplication';
export { default as CreateSplApplicationSetCommand } from './createSplApplicationSet';
export { default as ListToolkitsCommand } from './listToolkits';
export { default as OpenLinkCommand } from './openLink';
export { default as RefreshToolkitsCommand } from './refreshToolkits';
export { default as RemoveOutputChannelsCommand } from './removeOutputChannels';
export { default as SetConfigSettingCommand } from './setConfigSetting';
export { default as ShowImageBuildWebviewCommand } from './showImageBuildWebview';
export { default as ShowJobGraphCommand } from './showJobGraph';
export { default as ShowSubmitJobDialogCommand } from './showJobSubmitDialog';
export { Commands };

/**
 * Register commands
 * @param context    The extension context
 */
export function initialize(context: ExtensionContext): void {
    const streamsCommands = new Array<BaseCommand>();
    streamsCommands.push(new AddSplApplicationCommand());
    streamsCommands.push(new BuildSplApplicationsCommand(Commands.GENERAL.BUILD_SPL_APPLICATIONS));
    streamsCommands.push(new BuildSplApplicationsCommand(Commands.GENERAL.BUILD_SUBMIT_SPL_APPLICATIONS));
    streamsCommands.push(new CreateSplApplicationCommand());
    streamsCommands.push(new CreateSplApplicationSetCommand());
    streamsCommands.push(new RemoveOutputChannelsCommand());
    streamsCommands.push(new BuildCommand(Commands.BUILD.APP_DOWNLOAD, PostBuildAction.Download));
    streamsCommands.push(new BuildCommand(Commands.BUILD.APP_SUBMIT, PostBuildAction.Submit));
    streamsCommands.push(new BuildCommand(Commands.BUILD.APP_IMAGE, PostBuildAction.BuildImage));
    streamsCommands.push(new BuildCommand(Commands.BUILD.MAKE_DOWNLOAD, PostBuildAction.Download));
    streamsCommands.push(new BuildCommand(Commands.BUILD.MAKE_SUBMIT, PostBuildAction.Submit));
    streamsCommands.push(new BuildCommand(Commands.BUILD.MAKE_IMAGE, PostBuildAction.BuildImage));
    streamsCommands.push(new BuildCommand(Commands.BUILD.SUBMIT));
    streamsCommands.push(new BuildCommand(Commands.BUILD.IMAGE));
    streamsCommands.push(new BuildCommand(Commands.ENVIRONMENT.ADD_TOOLKIT_TO_BUILD_SERVICE));
    streamsCommands.push(new BuildCommand(Commands.ENVIRONMENT.REMOVE_TOOLKITS_FROM_BUILD_SERVICE));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.CPD_OPEN_CONSOLE));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.CPD_OPEN_DASHBOARD));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_CONSOLE));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_DASHBOARD));
    streamsCommands.push(new OpenLinkCommand(Commands.ENVIRONMENT.STREAMS_STANDALONE_OPEN_CONSOLE));
    streamsCommands.push(new ShowImageBuildWebviewCommand());
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
