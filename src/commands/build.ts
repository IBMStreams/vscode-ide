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
        } else {
            filePaths = [window.activeTextEditor.document.fileName];
        }

        switch (this.commandName) {
            case Commands.BUILD_APP_DOWNLOAD:
            case Commands.BUILD_APP_SUBMIT:
                return StreamsBuild.buildApp(filePaths[0], this._buildType)
                    .catch((error) => { throw error; });
            case Commands.BUILD_MAKE_DOWNLOAD:
            case Commands.BUILD_MAKE_SUBMIT:
                return StreamsBuild.buildMake(filePaths[0], this._buildType)
                    .catch((error) => { throw error; });
            case Commands.SUBMIT:
                return StreamsBuild.submit(filePaths)
                    .catch((error) => { throw error; });
            default:
                return null;
        }
    }
}
