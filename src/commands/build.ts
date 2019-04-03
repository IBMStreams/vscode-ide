import { ExtensionContext, Uri, window } from 'vscode';
import { SplBuild } from '../build';
import { IBaseCommand } from './base';
import { Commands } from './commands';

export class BuildCommand implements IBaseCommand {
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
        } else {
            filePaths = [ window.activeTextEditor.document.fileName ];
        }

        switch (this.commandName) {
            case Commands.BUILD_APP_DOWNLOAD:
            case Commands.BUILD_APP_SUBMIT:
                return SplBuild.buildApp(filePaths[0], this._buildType)
                    .catch((error) => { throw error; });
            case Commands.BUILD_MAKE_DOWNLOAD:
            case Commands.BUILD_MAKE_SUBMIT:
                return SplBuild.buildMake(filePaths[0], this._buildType)
                    .catch((error) => { throw error; });
            case Commands.SUBMIT:
                return SplBuild.submit(filePaths)
                    .catch((error) => { throw error; });
            default:
                return null;
        }
    }
}
