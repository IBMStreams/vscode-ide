import * as fs from 'fs';
import { ExtensionContext, Uri, window } from 'vscode';
import { Commands, BaseCommand } from '.';
import StreamsBuild from '../build';

/**
 * Command that allows a user to build or submit Streams application(s)
 */
export default class BuildCommand implements BaseCommand {
    private _buildType: number;

    /**
     * Initialize the command
     * @param commandName    The name of the command
     * @param buildType      The build type
     */
    constructor(public commandName: string, buildType?: number) {
        this._buildType = typeof buildType === 'number' ? buildType : null;
    }

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): Promise<void> {
        let filePaths = null;
        if (args[0] && Array.isArray(args[0][1])) {
            filePaths = args[0][1].map((uri: Uri) => uri.fsPath);
        } else if (window.activeTextEditor) {
            filePaths = [window.activeTextEditor.document.fileName];
        }

        switch (this.commandName) {
            case Commands.BUILD.APP_DOWNLOAD:
            case Commands.BUILD.APP_SUBMIT:
            case Commands.BUILD.APP_IMAGE:
                return StreamsBuild.buildApp(filePaths[0], this._buildType)
                    .catch((error) => { throw error; });
            case Commands.BUILD.MAKE_DOWNLOAD:
            case Commands.BUILD.MAKE_SUBMIT:
            case Commands.BUILD.MAKE_IMAGE:
                return StreamsBuild.buildMake(filePaths[0], this._buildType)
                    .catch((error) => { throw error; });
            case Commands.BUILD.SUBMIT:
                return StreamsBuild.submit(filePaths)
                    .catch((error) => { throw error; });
            case Commands.BUILD.IMAGE:
                return StreamsBuild.buildImage(filePaths)
                    .catch((error) => { throw error; });
            case Commands.ENVIRONMENT.ADD_TOOLKIT_TO_BUILD_SERVICE:
                let selected = null;
                if (filePaths && filePaths.length && fs.existsSync(filePaths[0])) {
                    selected = filePaths[0];
                }
                return StreamsBuild.addToolkitToBuildService(selected)
                    .catch((error) => { throw error; })
            case Commands.ENVIRONMENT.REMOVE_TOOLKITS_FROM_BUILD_SERVICE:
                return StreamsBuild.removeToolkitsFromBuildService()
                    .catch((error) => { throw error; })
            default:
                return null;
        }
    }
}
