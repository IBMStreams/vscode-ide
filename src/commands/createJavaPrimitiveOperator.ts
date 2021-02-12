import { PrimitiveOperatorType, Registry } from '@ibmstreams/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  commands,
  ExtensionContext,
  Uri,
  window,
  workspace,
  WorkspaceFolder
} from 'vscode';
import { Commands, BaseCommand } from '.';
import {
  JavaPrimitiveOperatorProcessingPattern,
  Logger,
  PrimitiveOperatorProperties
} from '../utils';

/**
 * Command that creates a Java primitive operator
 */
export default class CreateJavaPrimitiveOperator implements BaseCommand {
  public readonly commandName: string =
    Commands.GENERAL.CREATE_JAVA_PRIMITIVE_OPERATOR;

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
    return this._createJavaPrimitiveOperator(context, folderPath);
  }

  /**
   * Create a simple Java primitive operator. Prompt the user to select a project folder,
   * and provide the operator details.
   * @param context the extension context
   * @param folderPath the project folder path
   */
  private async _createJavaPrimitiveOperator(
    context: ExtensionContext,
    folderPath: string
  ): Promise<void> {
    Registry.getDefaultMessageHandler().logInfo(
      'Received request to create a Java primitive operator.'
    );

    // Show webview panel to get operator properties from the user
    const operatorProperties: PrimitiveOperatorProperties = await new Promise(
      (resolve) => {
        commands.executeCommand(
          Commands.GENERAL.SHOW_PRIMITIVE_OPERATOR_WEBVIEW_PANEL,
          PrimitiveOperatorType.Java,
          folderPath,
          resolve
        );
      }
    );
    if (operatorProperties) {
      // Create the Java application
      this._createJavaApp(context, operatorProperties);
    }
  }

  /**
   * Create a Java application with the following structure
   * ```text
   * /+ <project-folder>
   *    /+ impl
   *       /+ java
   *          /+ bin
   *          /+ src
   *             /+ <operator-namespace>
   *                /+ <operator-name>.java
   *    /+ Makefile
   * ```
   * @param context the extension context
   * @param properties the operator properties
   */
  private async _createJavaApp(
    context: ExtensionContext,
    properties: PrimitiveOperatorProperties
  ): Promise<void> {
    const {
      projectFolderPath,
      namespace,
      name,
      processingPattern
    } = properties;

    // Create impl/java/bin folder
    const binFolderPath = path.join(projectFolderPath, 'impl', 'java', 'bin');
    this._createFolder(binFolderPath);

    // Create impl/java/src/<operator-namespace> folder
    const namespaceFolderPath = path.join(
      projectFolderPath,
      'impl',
      'java',
      'src',
      ...namespace.split('.')
    );
    this._createFolder(namespaceFolderPath);

    // Create impl/java/src/<operator-namespace>/<operator-name>.java file
    const javaFilePath = path.join(
      projectFolderPath,
      'impl',
      'java',
      'src',
      ...namespace.split('.'),
      `${name}.java`
    );
    const templateMap = {
      [JavaPrimitiveOperatorProcessingPattern.Process]: 'process.java',
      [JavaPrimitiveOperatorProcessingPattern.Source]: 'source.java',
      [JavaPrimitiveOperatorProcessingPattern.Sink]: 'sink.java'
    };
    const templateFileName = templateMap[processingPattern];
    const templateFilePath = path.resolve(
      context.extensionPath,
      'templates',
      'primitiveOperators',
      'java',
      templateFileName
    );
    const templateFileContents = fs
      .readFileSync(templateFilePath, 'utf-8')
      .replace(/{{NAMESPACE}}/g, namespace)
      .replace(/{{NAME}}/g, name);
    this._createFile(javaFilePath, templateFileContents);

    // Create Makefile file
    const makefileFilePath = path.join(projectFolderPath, 'Makefile');
    const projectFolderName = path.basename(projectFolderPath);
    const sourceFilePath = `impl/java/src/${namespace
      .split('.')
      .join('/')}/*.java`;
    const makefileContents =
      'CLASS_PATH=$(STREAMS_INSTALL)/lib/com.ibm.streams.operator.jar:$(STREAMS_INSTALL)/lib/com.ibm.streams.operator.samples.jar\n' +
      'DEST_DIR=impl/java/bin\n' +
      `SOURCE_FILES=${sourceFilePath}\n` +
      `TOOLKIT_NAME=${projectFolderName}\n\n` +
      'all: compile-java build-toolkit\n\n' +
      'compile-java:\n' +
      '\tjavac -cp $(CLASS_PATH) -d $(DEST_DIR) $(SOURCE_FILES)\n\n' +
      'build-toolkit:\n' +
      '\t$(STREAMS_INSTALL)/bin/spl-make-toolkit -i . -n $(TOOLKIT_NAME)';
    this._createMakefile(makefileFilePath, makefileContents, sourceFilePath);

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

    // Open the impl/java/src/<operator-namespace>/<operator-name>.java and Makefile files
    const javaTextDoc = await workspace.openTextDocument(javaFilePath);
    await window.showTextDocument(javaTextDoc, { preview: false });
    const makefileTextDoc = await workspace.openTextDocument(makefileFilePath);
    await window.showTextDocument(makefileTextDoc);
    await window.showTextDocument(javaTextDoc, { preview: false });

    Registry.getDefaultMessageHandler().logInfo(
      `Created the Java primitive operator in ${projectFolderPath} with namespace ${namespace} and name ${name}.`
    );
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

  /**
   * Create a Makefile file
   * @param path the path to the file
   * @param content the file content
   * @param sourceFilePath the source file path
   */
  private _createMakefile(
    path: string,
    content: string,
    sourceFilePath: string
  ): void {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, content);
    } else {
      // Update Java source file paths in the Makefile if primitive operator(s) were created previously
      let existingMakefileContent = fs.readFileSync(path, 'utf8');
      const lineMatches = existingMakefileContent.match(
        /^(SOURCE_FILES?=.*)$/m
      );
      const fileMatches = existingMakefileContent.match(
        /^SOURCE_FILES?=(.*)$/m
      );
      if (
        lineMatches &&
        fileMatches &&
        fileMatches.length > 1 &&
        !fileMatches[1].split(' ').includes(sourceFilePath)
      ) {
        const lineStartIndex = lineMatches.index;
        const lineEndIndex = lineStartIndex + lineMatches[0].length;
        existingMakefileContent =
          existingMakefileContent.substring(0, lineStartIndex) +
          `${lineMatches[0]} ${sourceFilePath}` +
          existingMakefileContent.substring(lineEndIndex);
        fs.writeFileSync(path, existingMakefileContent);
      }
    }
  }
}
