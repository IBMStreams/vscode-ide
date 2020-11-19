import { Registry } from '@ibmstreams/common';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext, Uri, window, workspace } from 'vscode';
import * as xml2js from 'xml2js';
import { BaseCommand, Commands } from '.';
import { DOC_BASE_URL, Logger, SPL_APPLICATION_KEY, VSCode } from '../utils';

/**
 * Command that adds a SPL application to a SPL application set (`ApplicationSet_*.properties`)
 * ```
 * <?xml version="1.0" encoding="UTF-8"?>
 * <!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
 * <properties>
 *   <comment>Application Set Definition</comment>
 *   <entry key="applicationPath">/path/to/some.spl</entry>
 *   <entry key="applicationPath">/path/to/some.splmm</entry>
 *   <entry key="applicationPath">/path/to/some/Makefile</entry>
 * </properties>
 * ```
 */
export default class AddSplApplicationCommand implements BaseCommand {
  public readonly commandName: string = Commands.GENERAL.ADD_SPL_APPLICATION;
  private readonly docUrl = `${DOC_BASE_URL}/docs/spl-application-sets/#adding-a-spl-application-to-a-spl-application-set`;

  /**
   * Execute the command
   * @param context the extension context
   *  @param args array of arguments
   */
  public execute(context: ExtensionContext, ...args: any[]): any {
    let propertiesFilePath = null;
    if (args[0] && Array.isArray(args[0][1]) && args[0][1].length) {
      propertiesFilePath = args[0][1][0].fsPath;
    } else if (window.activeTextEditor) {
      propertiesFilePath = window.activeTextEditor.document.fileName;
    }

    Logger.info(
      null,
      `Received request to add a SPL application to a SPL application set.\nSPL application set: ${propertiesFilePath}`,
      false,
      true
    );

    return this.promptForSplApplication(propertiesFilePath);
  }

  /**
   * Get SPL applications located in all workspace folders
   * @param context the extension context
   * @param propertiesFilePath the properties file path
   */
  private async promptForSplApplication(
    propertiesFilePath: string
  ): Promise<void> {
    try {
      const appFileUri = await window
        .showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          defaultUri: Uri.file(path.dirname(propertiesFilePath)),
          openLabel: 'Add SPL application'
        })
        .then((selected: Uri[]) =>
          selected && selected.length
            ? this.getSelectedApplication(selected[0], propertiesFilePath)
            : null
        );
      if (appFileUri) {
        let appFilePath = appFileUri.fsPath;
        appFilePath = VSCode.sanitizePath(appFilePath);

        // Read ApplicationSet_*.properties to add SPL application entry
        if (fs.existsSync(propertiesFilePath)) {
          const xmlContent = fs.readFileSync(propertiesFilePath, 'utf8');
          const xmlJson = await xml2js.parseStringPromise(xmlContent);
          if (!xmlJson.properties.entry) {
            xmlJson.properties.entry = [];
          }

          // Do not add if application is already in set
          const appExists = xmlJson.properties.entry.some((entry) => {
            const keyAttr = entry?.$?.key;
            const filePath = entry?._;
            return (
              keyAttr &&
              keyAttr === SPL_APPLICATION_KEY &&
              filePath &&
              filePath === appFilePath
            );
          });
          if (appExists) {
            return Logger.warn(
              null,
              `The selected SPL application is already included in the SPL application set.\nSPL application set: ${propertiesFilePath}\nSPL application: ${appFilePath}`
            );
          }

          // Add new entry: <entry key="applicationPath">appFilePath</entry>
          xmlJson.properties.entry.push({
            $: { key: SPL_APPLICATION_KEY },
            _: appFilePath
          });
          const xmlBuilder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'UTF-8' },
            doctype: { sysID: 'http://java.sun.com/dtd/properties.dtd' }
          });
          const newXmlContent = xmlBuilder.buildObject(xmlJson);
          fs.writeFileSync(propertiesFilePath, newXmlContent);

          // Open the ApplicationSet_*.properties file
          const propertiesTextDoc = await workspace.openTextDocument(
            propertiesFilePath
          );
          await window.showTextDocument(propertiesTextDoc);

          Logger.info(
            null,
            `Added the SPL application to the SPL application set.\nSPL application set: ${propertiesFilePath}\nSPL application: ${appFilePath}`
          );
        }
      }
    } catch (err) {
      Registry.getDefaultMessageHandler().handleError(
        `Failed to add a SPL application to the SPL application set.`,
        {
          detail: `SPL application set: ${propertiesFilePath}\n${
            err.stack || err.message
          }`,
          notificationButtons: [
            {
              label: 'See Documentation',
              callbackFn: async (): Promise<void> =>
                Registry.openUrl(this.docUrl)
            }
          ]
        }
      );
    }
  }

  /**
   * Get the selected SPL application if it is valid
   * @param selectedFileUri the selected file URI
   * @param propertiesFilePath the properties file path
   */
  private getSelectedApplication(
    selectedFileUri: Uri,
    propertiesFilePath: string
  ): Uri {
    const filePath = selectedFileUri.fsPath;
    const fileExt = path.extname(filePath);
    const fileName = path.basename(filePath);
    // Check if the selected file is a valid file type
    if (fileExt !== '.spl' && fileExt !== '.splmm' && fileName !== 'Makefile') {
      Registry.getDefaultMessageHandler().handleError(
        `The selected file is not a valid SPL application: ${fileName}. Only *.spl, *.splmm, and Makefile files are supported.`,
        {
          notificationButtons: [
            {
              label: 'See Documentation',
              callbackFn: async (): Promise<void> =>
                Registry.openUrl(this.docUrl)
            },
            {
              label: 'Select Another File',
              callbackFn: async (): Promise<void> =>
                this.promptForSplApplication(propertiesFilePath)
            }
          ]
        }
      );
      return null;
    }
    return selectedFileUri;
  }
}
