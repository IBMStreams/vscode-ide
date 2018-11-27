'use strict';

import * as fs from 'fs';

import { commands, window, workspace, ExtensionContext, Uri } from 'vscode';

import { BaseCommand } from './command';
import { SplLogger } from '../logger';

export class CreateApplicationCommand implements BaseCommand {
    commandName: string = 'ibm-streams.createApplication';

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    execute(context: ExtensionContext, ...args: any[]): any {
        return this.createApplication();
    }

    /**
     * Create a simple Streams application. Prompt the user to select a root folder,
     * and specify a namespace and composite.
     */
    private async createApplication(): Promise<void> {
        SplLogger.info(null, 'Received request to create an IBM Streams application', false, true);

        const rootUri = await this.promptForRootFolder();
        const rootDir = rootUri.fsPath;
        const namespace = await this.promptForInput('namespace');
        const composite = await this.promptForInput('composite');

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
        commands.executeCommand('vscode.open', Uri.file(compositeFile));

        SplLogger.info(null, `Created ${namespace}::${composite}`);
    }

    /**
     * Prompts the user to select a root folder
     */
    private async promptForRootFolder(): Promise<Uri> {
        return window.showOpenDialog({
            'canSelectFiles': false,
            'canSelectFolders': true,
            'canSelectMany': false,
            'openLabel': 'Set as root folder'
        }).then((selected: Uri[]) => {
            if (selected && selected.length === 1) {
                return selected[0];
            } else {
                throw new Error('Application creation canceled, a root folder was not selected');
            }
        });
    }

    /**
     * Prompts the user to specify a namespace or composite
     * @param type    The input type
     */
    private async promptForInput(type: string): Promise<string> {
        const capitalizedType = type.charAt(0).toUpperCase() + type.substring(1).toLowerCase();
        return window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: `your${capitalizedType}Name`,
            prompt: `Provide a ${type} name`
        }).then((input: string) => {
            if (input && input.trim() !== '') {
                return input;
            } else {
                throw new Error(`Application creation canceled, a ${type} was not specified`);
            }
        });
    }
}
