import { PrimitiveOperatorType, Registry } from '@ibmstreams/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  commands,
  ExtensionContext,
  TextDocument,
  Uri,
  window,
  workspace,
  WorkspaceFolder
} from 'vscode';
import { Commands, BaseCommand } from '.';
import StreamsBuild from '../build';
import { PrimitiveOperatorProperties } from '../utils';

/**
 * Command that creates a C+++ primitive operator
 */
export default class CreateCppPrimitiveOperator implements BaseCommand {
  public readonly commandName: string =
    Commands.GENERAL.CREATE_CPP_PRIMITIVE_OPERATOR;

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
    return this._createCppPrimitiveOperator(context, folderPath);
  }

  /**
   * Create a simple C++ primitive operator. Prompt the user to select a project folder,
   * and provide the operator details.
   * @param context the extension context
   * @param folderPath the project folder path
   */
  private async _createCppPrimitiveOperator(
    context: ExtensionContext,
    folderPath: string
  ): Promise<void> {
    // Show webview panel to get operator properties from the user
    const operatorProperties: PrimitiveOperatorProperties = await new Promise(
      (resolve) => {
        commands.executeCommand(
          Commands.GENERAL.SHOW_PRIMITIVE_OPERATOR_WEBVIEW_PANEL,
          PrimitiveOperatorType.Cpp,
          folderPath,
          resolve
        );
      }
    );
    if (operatorProperties) {
      // Create the C++ application
      this._createCppApp(context, operatorProperties);
    }
  }

  /**
   * Create a C++ application with the following structure
   * ```text
   * /+ <project-folder>
   *    /+ <operator-namespace>
   *       /+ <operator-name>
   *          /+ <operator-name>.xml
   *          /+ <operator-name>_cpp.cgt
   *          /+ <operator-name>_cpp.pm
   *          /+ <operator-name>_h.cgt
   *          /+ <operator-name>_h.pm
   *    /+ Makefile
   * ```
   * @param context the extension context
   * @param properties the operator properties
   */
  private async _createCppApp(
    context: ExtensionContext,
    properties: PrimitiveOperatorProperties
  ): Promise<void> {
    const { projectFolderPath, namespace, name, genericOperator } = properties;

    // Create <operator-namespace>/<operator-name> folder
    const nameFolderPath = path.join(projectFolderPath, namespace, name);
    this._createFolder(nameFolderPath);

    // Call spl-make-operator to create the operator
    const isSuccess = await new Promise((resolve) => {
      StreamsBuild.makeCppPrimitiveOperator(
        projectFolderPath,
        path.join(namespace, name),
        genericOperator,
        resolve
      );
    });

    if (isSuccess) {
      // Create Makefile file
      const makefileFilePath = path.join(projectFolderPath, 'Makefile');
      const projectFolderName = path.basename(projectFolderPath);
      const makefileContents =
        `TOOLKIT_NAME=${projectFolderName}\n\n` +
        'all: build-toolkit\n\n' +
        'build-toolkit:\n' +
        '\t$(STREAMS_INSTALL)/bin/spl-make-toolkit -i . -m -n $(TOOLKIT_NAME)';
      this._createFile(makefileFilePath, makefileContents);

      // Create impl folder
      const implFolderPath = path.join(projectFolderPath, 'impl');
      const implFolderNames = ['lib', 'include', 'src'];
      this._createFolder(implFolderPath);
      implFolderNames.map((name) => {
        const folderPath = path.join(implFolderPath, name);
        this._createFolder(folderPath);
      });

      // Add the project folder to the workspace if it or folder above it is not already a workspace folder
      let currentFolderPath = projectFolderPath;
      const rootFolderPath = path.parse(process.cwd()).root;
      const workspaceFolderPaths = workspace.workspaceFolders
        ? workspace.workspaceFolders.map(
            (folder: WorkspaceFolder) => folder.uri.fsPath
          )
        : [];
      const notWorkspaceFolder = (folderPath: string): boolean =>
        !workspaceFolderPaths.includes(folderPath);
      const notRootFolder = (folderPath: string): boolean =>
        folderPath !== rootFolderPath;
      while (
        notWorkspaceFolder(currentFolderPath) &&
        notRootFolder(currentFolderPath)
      ) {
        currentFolderPath = path.dirname(currentFolderPath);
      }
      if (currentFolderPath === rootFolderPath) {
        workspace.updateWorkspaceFolders(
          workspace.workspaceFolders ? workspace.workspaceFolders.length : 0,
          null,
          { uri: Uri.file(projectFolderPath) }
        );
      }

      // Open the <operator-namespace>/<operator-name>/<operator-name>.xml file
      const modelFilePath = path.join(
        projectFolderPath,
        namespace,
        name,
        `${name}.xml`
      );
      let modelTextDoc: TextDocument;
      if (fs.existsSync(modelFilePath)) {
        modelTextDoc = await workspace.openTextDocument(modelFilePath);
        await window.showTextDocument(modelTextDoc, { preview: false });
      }
      // Open the <operator-namespace>/<operator-name>/<operator-name>_h.cgt file
      const headerFilePath = path.join(
        projectFolderPath,
        namespace,
        name,
        `${name}_h.cgt`
      );
      let headerTextDoc: TextDocument;
      if (fs.existsSync(headerFilePath)) {
        headerTextDoc = await workspace.openTextDocument(headerFilePath);
        await window.showTextDocument(headerTextDoc, { preview: false });
      }
      // Open the <operator-namespace>/<operator-name>/<operator-name>_cpp.cgt file
      const implFilePath = path.join(
        projectFolderPath,
        namespace,
        name,
        `${name}_cpp.cgt`
      );
      if (fs.existsSync(implFilePath)) {
        const implTextDoc = await workspace.openTextDocument(implFilePath);
        await window.showTextDocument(implTextDoc, { preview: false });
      }
      // Open the Makefile file
      const makefileTextDoc = await workspace.openTextDocument(
        makefileFilePath
      );
      await window.showTextDocument(makefileTextDoc);

      // Set the model file to be active editor
      if (modelTextDoc) {
        await window.showTextDocument(modelTextDoc, { preview: false });
      }

      const messageHandler = Registry.getMessageHandler(projectFolderPath);
      if (messageHandler) {
        messageHandler.logInfo(
          `Created the C++ primitive operator in ${projectFolderPath} with namespace ${namespace} and name ${name}.`,
          { showNotification: true }
        );
      }
    }
  }

  /**
   * Create a folder
   * @param path the path to the folder
   */
  private _createFolder(path: string): void {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  }

  /**
   * Create a file
   * @param path the path to the file
   * @param content the file content
   */
  private _createFile(path: string, content: string): void {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, content);
    }
  }
}
