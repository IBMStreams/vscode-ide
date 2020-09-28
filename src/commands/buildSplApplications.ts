import {
    PostBuildAction,
    Registry,
    SourceArchiveUtils
} from '@ibmstreams/common';
import * as fs from 'fs';
import * as path from 'path';
import { commands, ExtensionContext, window } from 'vscode';
import * as xml2js from 'xml2js';
import { BaseCommand, Commands } from '.';
import StreamsBuild from '../build';
import { Logger, SPL_APPLICATION_KEY, VSCode } from '../utils';

/**
 * Command that builds SPL applications in a SPL application set (`ApplicationSet_*.properties`)
 * ```
 * <?xml version="1.0" encoding="UTF-8"?>
 * <!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
 *   <comment>Application Set Definition</comment>
 *   <entry key="applicationPath">/path/to/some.spl</entry>
 *   <entry key="applicationPath">/path/to/some.splmm</entry>
 *   <entry key="applicationPath">/path/to/some/Makefile</entry>
 * </properties>
 * ```
 */
export default class BuildSplApplicationsCommand implements BaseCommand {
    private readonly docUrl =
        'https://github.com/IBMStreams/vscode-ide/wiki/Working-with-SPL-application-sets';

    /**
     * Initialize the command
     * @param commandName the name of the command
     */
    constructor(public commandName: string) { }

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
            `Received request to build${
            this.commandName === Commands.GENERAL.BUILD_SUBMIT_SPL_APPLICATIONS
                ? ' and submit'
                : ''
            } SPL applications in a SPL application set.\nSPL application set: ${propertiesFilePath}`,
            false,
            true
        );

        return this.buildSplApplications(propertiesFilePath);
    }

    /**
     * Build SPL applications
     * @param context the extension context
     * @param propertiesFilePath the properties file path
     */
    private async buildSplApplications(
        propertiesFilePath: string
    ): Promise<void> {
        try {
            if (fs.existsSync(propertiesFilePath)) {
                // Read ApplicationSet_*.properties to get SPL applications
                const xmlContent = fs.readFileSync(propertiesFilePath, 'utf8');
                const xmlJson = await xml2js.parseStringPromise(xmlContent);
                const entries = xmlJson?.properties?.entry;
                if (!entries) {
                    throw new Error('Invalid XML structure');
                }
                if (entries.length) {
                    // Validate <entry> nodes
                    const appFilePaths = entries
                        .filter((entry) => this.isValidEntryNode(entry))
                        .map((entry: any) => entry._);
                    if (!appFilePaths.length) {
                        return this.handleNoApplications();
                    }

                    // Add applications to workspace
                    const workspaceFolderPaths = VSCode.getWorkspaceFolderPaths();
                    const appRoots = appFilePaths.map((filePath: string) =>
                        SourceArchiveUtils.getApplicationRoot(
                            workspaceFolderPaths,
                            filePath,
                            true
                        )
                    );
                    VSCode.addFoldersToWorkspace(appRoots);

                    Logger.info(
                        null,
                        `Building${
                        this.commandName ===
                            Commands.GENERAL.BUILD_SUBMIT_SPL_APPLICATIONS
                            ? ' and submitting'
                            : ''
                        } the SPL applications in the SPL application set...\nSPL application set: ${propertiesFilePath}`
                    );

                    // Trigger application builds
                    appFilePaths.forEach((filePath: string) => {
                        const fileExt = path.extname(filePath);
                        const fileName = path.basename(filePath);
                        const postBuildAction =
                            this.commandName === Commands.GENERAL.BUILD_SPL_APPLICATIONS
                                ? PostBuildAction.Download
                                : PostBuildAction.Submit;
                        if (fileExt === '.spl' || fileExt === '.splmm') {
                            StreamsBuild.buildApp(filePath, postBuildAction);
                        } else if (fileName === 'Makefile') {
                            StreamsBuild.buildMake(filePath, postBuildAction);
                        }
                    });
                    return;
                }
            }
            return this.handleNoApplications();
        } catch (err) {
            Registry.getDefaultMessageHandler().handleError(
                `Failed to build${
                this.commandName === Commands.GENERAL.BUILD_SUBMIT_SPL_APPLICATIONS
                    ? ' and submit'
                    : ''
                } the SPL applications in the SPL application set.`,
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
     * Determine if a XML `<entry>` node is valid
     * ```
     * <entry key="applicationPath">/path/to/some.spl</entry>
     * <entry key="applicationPath">/path/to/some.splmm</entry>
     * <entry key="applicationPath">/path/to/some/Makefile</entry>
     * ```
     * @param entry the node
     */
    private isValidEntryNode(entry: any): boolean {
        const keyAttr = entry?.$?.key;
        if (!keyAttr) {
            this.warnUser(
                `A SPL application entry is missing the "key" attribute.`,
                false,
                false
            );
            return false;
        }
        if (keyAttr !== SPL_APPLICATION_KEY) {
            this.warnUser(
                `A SPL application entry has an incorrect value for the "key" attribute: ${keyAttr}. The value must be: ${SPL_APPLICATION_KEY}.`,
                false,
                false
            );
            return false;
        }
        const filePath = entry?._;
        if (!filePath) {
            this.warnUser(`A SPL application was not specified.`, false, false);
            return false;
        }
        if (!fs.existsSync(filePath)) {
            this.warnUser(
                `The SPL application does not exist: ${filePath}.`,
                false,
                false
            );
            return false;
        }
        const fileExt = path.extname(filePath);
        const fileName = path.basename(filePath);
        if (fileExt !== '.spl' && fileExt !== '.splmm' && fileName !== 'Makefile') {
            this.warnUser(
                `The SPL application is not valid: ${filePath}. Only *.spl, *.splmm, and Makefiles are supported.`,
                false,
                false
            );
            return false;
        }
        return true;
    }

    /**
     * Handle scenario where there are no SPL applications to build
     */
    private handleNoApplications(): void {
        return this.warnUser(
            `There are no valid SPL applications in the SPL application set to build${
            this.commandName === Commands.GENERAL.BUILD_SUBMIT_SPL_APPLICATIONS
                ? ' and submit'
                : ''
            }. Ensure that your SPL applications were added correctly.`,
            true,
            true,
            [
                {
                    label: 'Add SPL Application',
                    callbackFn: async (): Promise<void> =>
                        commands.executeCommand(Commands.GENERAL.ADD_SPL_APPLICATION)
                }
            ]
        );
    }

    /**
     * Warn user of an issue
     * @param message the warning message
     * @param showNotification whether or not to show a notification
     * @param showDocButton whether or not to show the documentation button
     * @param buttons the notification buttons
     */
    private warnUser(
        message: string,
        showNotification: boolean,
        showDocButton: boolean,
        buttons?: any[]
    ): void {
        const notificationButtons = [];
        if (showDocButton) {
            notificationButtons.push({
                label: 'See Documentation',
                callbackFn: async (): Promise<void> => Registry.openUrl(this.docUrl)
            });
        }
        if (buttons) {
            notificationButtons.push(...buttons);
        }
        return Registry.getDefaultMessageHandler().handleWarn(message, {
            showNotification,
            ...(notificationButtons.length && { notificationButtons })
        });
    }
}
