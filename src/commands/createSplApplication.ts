import * as fs from 'fs-extra';
import * as path from 'path';
import {
    commands,
    ExtensionContext,
    Uri,
    window,
    workspace
} from 'vscode';
import { Commands, BaseCommand } from '.';
import { SplUtils } from '../streams';
import { BuiltInCommands, Logger } from '../utils';

/**
 * Command that creates a simple SPL application
 */
export default class CreateSplApplicationCommand implements BaseCommand {
    public readonly commandName: string = Commands.GENERAL.CREATE_SPL_APPLICATION;

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
        try {
            Logger.info(null, 'Received request to create a SPL application.', false, true);

            const rootUri = await this._promptForRootFolder();
            const rootDir = rootUri.fsPath;
            const namespace = await this._promptForNamespace();
            const composite = await this._promptForComposite(path.join(rootDir, namespace));

            // Create namespace directory
            const namespaceDir = path.join(rootDir, namespace);
            if (!fs.existsSync(namespaceDir)) {
                fs.mkdirSync(namespaceDir);
            }

            // Create main composite file
            const compositeFile = path.join(rootDir, namespace, `${composite}.spl`);
            if (!fs.existsSync(compositeFile)) {
                fs.writeFileSync(compositeFile, `namespace ${namespace};\n\ncomposite ${composite} {\n  graph\n    stream<rstring str> Src = Beacon() {\n      // Insert operator clauses here\n    }\n}`);
            }

            // Create info.xml file
            const infoXmlFile = path.join(rootDir, 'info.xml');
            if (!fs.existsSync(infoXmlFile)) {
                fs.writeFileSync(infoXmlFile, `<?xml version="1.0" encoding="UTF-8"?>\n<info:toolkitInfoModel xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:info="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo">\n  <info:identity>\n    <info:name>${composite}</info:name>\n    <info:description/>\n    <info:version>1.0.0</info:version>\n    <info:requiredProductVersion>4.3.0.0</info:requiredProductVersion>\n  </info:identity>\n  <info:dependencies/>\n</info:toolkitInfoModel>`);
            }

            // Add the root folder to the workspace and open the main composite file
            workspace.updateWorkspaceFolders(workspace.workspaceFolders ? workspace.workspaceFolders.length : 0, null, { uri: rootUri });
            commands.executeCommand(BuiltInCommands.Open, Uri.file(compositeFile));

            Logger.info(null, `Created the SPL application ${namespace}::${composite} at: ${compositeFile}.`);
        } catch (err) {
            // Do nothing
        }
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
            throw new Error();
        });
    }

    /**
     * Prompts the user to specify a namespace
     */
    private async _promptForNamespace(): Promise<string> {
        return window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: 'yournamespace',
            prompt: 'Provide a namespace',
            validateInput: (value: string) => {
                if (value === '') {
                    return undefined;
                }
                const isValidNamespaceResult = SplUtils.isValidNamespace(value);
                if (isValidNamespaceResult !== true) {
                    return `${isValidNamespaceResult} Namespace must start with an ASCII letter or underscore, followed by ASCII letters, digits, underscores, or period delimiters.`;
                }
                return undefined;
            }
        }).then((input: string) => {
            if (input && input.trim() !== '') {
                return input;
            }
            throw new Error();
        });
    }

    /**
     * Prompts the user to specify a composite name
     * @param namespacePath    The namespace path
     */
    private async _promptForComposite(namespacePath: string): Promise<string> {
        return window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: 'YourCompositeName',
            prompt: 'Provide a composite name',
            validateInput: (value: string) => {
                if (value === '') {
                    return undefined;
                }
                if (fs.existsSync(path.join(namespacePath, `${value}.spl`))) {
                    return 'A SPL file already exists for the entered namespace and composite name.'
                }
                const isValidIdentifierResult = SplUtils.isValidIdentifier(value);
                if (isValidIdentifierResult !== true) {
                    return `${isValidIdentifierResult} Name must start with an ASCII letter or underscore, followed by ASCII letters, digits, or underscores.`;
                }
                return undefined;
            }
        }).then((input: string) => {
            if (input && input.trim() !== '') {
                return input;
            }
            throw new Error();
        });
    }
}
