import * as fs from 'fs';
import {
    commands,
    ExtensionContext,
    Uri,
    window,
    workspace
} from 'vscode';
import { Commands, BaseCommand } from '.';
import { BuiltInCommands, Logger } from '../utils';

/**
 * Command that creates a simple Streams application from a template
 */
export default class CreateApplicationCommand implements BaseCommand {
    public readonly commandName: string = Commands.GENERAL.CREATE_APPLICATION;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): any {
        return this._createApplication();
    }

    /**
     * Create a simple Streams application. Prompt the user to select a root folder,
     * and specify a namespace and composite.
     */
    private async _createApplication(): Promise<void> {
        Logger.info(null, 'Received request to create an IBM Streams application', false, true);

        const rootUri = await this._promptForRootFolder();
        const rootDir = rootUri.fsPath;
        const namespace = await this._promptForInput('namespace');
        const composite = await this._promptForInput('composite');

        // Create namespace directory
        const namespaceDir = `${rootDir}/${namespace}`;
        if (!fs.existsSync(namespaceDir)) {
            fs.mkdirSync(namespaceDir);
        }

        // Create main composite file
        const compositeFile = `${rootDir}/${namespace}/${composite}.spl`;
        if (!fs.existsSync(compositeFile)) {
            fs.writeFileSync(compositeFile, `namespace ${namespace};\n\ncomposite ${composite} {\n\n}`);
        }

        // Create info.xml file
        const infoXmlFile = `${rootDir}/info.xml`;
        if (!fs.existsSync(infoXmlFile)) {
            fs.writeFileSync(infoXmlFile, `<?xml version="1.0" encoding="UTF-8"?>\n<info:toolkitInfoModel xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:info="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo">\n  <info:identity>\n    <info:name>${composite}</info:name>\n    <info:description>YOUR_TOOLKIT_DESCRIPTION</info:description>\n    <info:version>1.0.0</info:version>\n    <info:requiredProductVersion>4.3.0.0</info:requiredProductVersion>\n  </info:identity>\n  <info:dependencies/>\n</info:toolkitInfoModel>`);
        }

        // Add the root folder to the workspace and open the main composite file
        workspace.updateWorkspaceFolders(workspace.workspaceFolders ? workspace.workspaceFolders.length : 0, null, { uri: rootUri });
        commands.executeCommand(BuiltInCommands.Open, Uri.file(compositeFile));

        Logger.info(null, `Created ${namespace}::${composite}`);
    }

    /**
     * Prompts the user to select a root folder
     */
    private async _promptForRootFolder(): Promise<Uri> {
        return window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Set as root folder'
        }).then((selected: Uri[]) => {
            if (selected && selected.length === 1) {
                return selected[0];
            }
            throw new Error('Application creation canceled, a root folder was not selected.');
        });
    }

    /**
     * Prompts the user to specify a namespace or composite
     * @param type    The input type
     */
    private async _promptForInput(type: string): Promise<string> {
        const capitalizedType = type.charAt(0).toUpperCase() + type.substring(1).toLowerCase();
        return window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: `your${capitalizedType}Name`,
            prompt: `Provide a ${type} name`
        }).then((input: string) => {
            if (input && input.trim() !== '') {
                return input;
            }
            throw new Error(`Application creation canceled, a ${type} was not specified.`);
        });
    }
}
