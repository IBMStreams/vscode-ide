import { Registry } from '@ibmstreams/common';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext, commands, window, workspace } from 'vscode';
import { Commands, BaseCommand } from '.';
import { Logger, VSCode } from '../utils';

interface SplApplicationSetProperties {
    location: string;
    name: string;
}

/**
 * Command that creates a SPL application set (`ApplicationSet_*.properties`)
 * ```
 * <?xml version="1.0" encoding="UTF-8"?>
 * <!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
 *   <comment>Application Set Definition</comment>
 * </properties>
 * ```
 */
export default class CreateSplApplicationSetCommand implements BaseCommand {
    public readonly commandName: string =
        Commands.GENERAL.CREATE_SPL_APPLICATION_SET;

    /**
     * Execute the command
     * @param context the extension context
     * @param args array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): any {
        let folderPath = null;
        if (args[0] && Array.isArray(args[0][1]) && args[0][1].length) {
            const selectedPath = args[0][1][0].fsPath;
            folderPath = fs.lstatSync(selectedPath).isDirectory()
                ? selectedPath
                : path.dirname(selectedPath);
        } else if (window.activeTextEditor) {
            folderPath = path.dirname(window.activeTextEditor.document.fileName);
        }
        return this.createApplicationSet(context, folderPath);
    }

    /**
     * Create a Streams application set
     * @param context the extension context
     * @param folderPath the project folder path
     */
    private async createApplicationSet(
        context: ExtensionContext,
        folderPath: string
    ): Promise<void> {
        try {
            Logger.info(
                null,
                'Received request to create a SPL application set.',
                false,
                true
            );

            // Show webview panel to get properties from the user
            const properties: SplApplicationSetProperties = await new Promise(
                (resolve) => {
                    commands.executeCommand(
                        Commands.GENERAL.SHOW_SPL_APPLICATION_SET_WEBVIEW_PANEL,
                        folderPath,
                        resolve
                    );
                }
            );
            if (properties) {
                const { location: locationFolderPath, name } = properties;

                // Create ApplicationSet_*.properties file
                const propertiesFilePath = path.join(
                    locationFolderPath,
                    `ApplicationSet_${name}.properties`
                );
                const propertiesFileContents =
                    '<?xml version="1.0" encoding="UTF-8"?>\n' +
                    '<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">\n' +
                    '<properties>\n' +
                    '  <comment>Application Set Definition</comment>\n' +
                    '</properties>';
                this.createFile(propertiesFilePath, propertiesFileContents);

                // Add the location folder to the workspace
                VSCode.addFoldersToWorkspace([locationFolderPath]);

                // Open the ApplicationSet_*.properties file
                const propertiesTextDoc = await workspace.openTextDocument(
                    propertiesFilePath
                );
                await window.showTextDocument(propertiesTextDoc);

                Logger.info(
                    null,
                    `Created the SPL application set: ${propertiesFilePath}.`
                );
            }
        } catch (err) {
            Registry.getDefaultMessageHandler().handleError(
                `Failed to created a SPL application set.`,
                { detail: err.stack || err.message }
            );
        }
    }

    /**
     * Create a file
     * @param path the path to the file
     * @param content the file content
     */
    private createFile(path: string, content: string): void {
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, content);
        }
    }
}
