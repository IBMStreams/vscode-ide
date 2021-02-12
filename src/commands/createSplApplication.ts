import { Registry } from '@ibmstreams/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { commands, ExtensionContext, window, workspace } from 'vscode';
import { BaseCommand, Commands } from '.';
import { Logger, VSCode } from '../utils';

interface SplApplicationProperties {
  applicationFolderPath: string;
  namespace: string;
  mainCompositeName: string;
}

/**
 * Command that creates a minimal SPL application
 * ```
 * /+ <application-folder>
 *    /+ <namespace>
 *       /+ <main-composite>.spl
 *    /+ info.xml
 * ```
 */
export default class CreateSplApplicationCommand implements BaseCommand {
  public readonly commandName: string = Commands.GENERAL.CREATE_SPL_APPLICATION;

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
    return this.createApplication(folderPath);
  }

  /**
   * Create a Streams application
   * @param context the extension context
   * @param folderPath the project folder path
   */
  private async createApplication(folderPath: string): Promise<void> {
    try {
      Registry.getDefaultMessageHandler().logInfo(
        'Received request to create a SPL application.'
      );

      // Show webview panel to get properties from the user
      const properties: SplApplicationProperties = await new Promise(
        (resolve) => {
          commands.executeCommand(
            Commands.GENERAL.SHOW_SPL_APPLICATION_WEBVIEW_PANEL,
            folderPath,
            resolve
          );
        }
      );
      if (properties) {
        let { applicationFolderPath } = properties;
        const { namespace, mainCompositeName } = properties;

        applicationFolderPath = VSCode.sanitizePath(applicationFolderPath);

        // Create namespace folder
        const namespaceFolderPath = path.join(applicationFolderPath, namespace);
        this.createFolder(namespaceFolderPath);

        // Create main composite file
        const mainCompositeFilePath = path.join(
          applicationFolderPath,
          namespace,
          `${mainCompositeName}.spl`
        );
        this.createFile(
          mainCompositeFilePath,
          `namespace ${namespace};\n\ncomposite ${mainCompositeName} {\n  graph\n    stream<rstring str> Src = Beacon() {\n      // Insert operator clauses here\n    }\n}`
        );

        // Create info.xml file
        const infoXmlFilePath = path.join(applicationFolderPath, 'info.xml');
        this.createFile(
          infoXmlFilePath,
          `<?xml version="1.0" encoding="UTF-8"?>\n<info:toolkitInfoModel xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:info="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo">\n  <info:identity>\n    <info:name>${mainCompositeName}</info:name>\n    <info:description/>\n    <info:version>1.0.0</info:version>\n    <info:requiredProductVersion>4.3.0.0</info:requiredProductVersion>\n  </info:identity>\n  <info:dependencies/>\n</info:toolkitInfoModel>`
        );

        // Add the application folder folder to the workspace
        VSCode.addFoldersToWorkspace([applicationFolderPath]);

        // Open the <mainCompositeName>.spl file
        const mainCompositeTextDoc = await workspace.openTextDocument(
          mainCompositeFilePath
        );
        await window.showTextDocument(mainCompositeTextDoc);

        Registry.getDefaultMessageHandler().logInfo(
          `Created the SPL application ${namespace}::${mainCompositeName} in the application folder: ${applicationFolderPath}.`
        );
      }
    } catch (err) {
      Registry.getDefaultMessageHandler().logError(
        `Failed to created a SPL application.`,
        {
          detail: err.stack || err.message,
          showNotification: true
        }
      );
    }
  }

  /**
   * Create a folder
   * @param path the path to the folder
   */
  private createFolder(path: string): void {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
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
