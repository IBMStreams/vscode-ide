'use strict';

import * as fs from 'fs';
import * as _ from 'underscore';

import { commands, window, workspace, Uri } from 'vscode';

import { SplBuilder } from './spl-build-common';
import { SplConfig, Config } from './config';
import { LintHandler } from './linter';
import { SplLogger, MessageHandler } from './logger';

export class SplBuild {
    /**
     * Perform a SPL build
     * @param uri       The file URI
     * @param action    The build action to take
     */
    public static async handle(uri: Uri, action: number): Promise<void> {
        let statusMessage = 'Received request to build';
        switch(action) {
            case SplBuilder.BUILD_ACTION.DOWNLOAD:
                statusMessage += ' and download';
                break;
            case SplBuilder.BUILD_ACTION.SUBMIT:
            statusMessage += ' and submit';
                break;
        }
        SplLogger.info(statusMessage, false, true);

        const filePath = uri ? uri.fsPath : window.activeTextEditor.document.fileName;
        if (filePath) {
            SplLogger.debug(`Selected: ${filePath}`);

            const workspaceFolders = _.map(workspace.workspaceFolders, folder => folder.uri.fsPath);
            const appRoot = SplBuilder.getApplicationRoot(workspaceFolders, filePath);
            const credentialsSetting = SplConfig.getSetting(Config.STREAMING_ANALYTICS_CREDENTIALS);
            const streamingAnalyticsCredentials = credentialsSetting ? JSON.stringify(credentialsSetting) : null;

            const fileContents = await this.getFileContents(uri);
            const [ namespace, composites ] = await this.getCompositeOptions(fileContents);
            const mainComposite = await this.getCompositeToBuild(appRoot, namespace, composites);
            const toolkitsDir = await this.getToolkitsDir();

            const messageHandler = new MessageHandler();
            const lintHandler = new LintHandler(SplBuilder.SPL_MSG_REGEX, appRoot);
            const openUrlHandler = url => commands.executeCommand('vscode.open', Uri.parse(url));
            const builder = new SplBuilder(messageHandler, lintHandler, openUrlHandler);

            const appArchivePath = await builder.buildSourceArchive(appRoot, toolkitsDir, mainComposite);
            try {
                builder.build(action, streamingAnalyticsCredentials, { filename: appArchivePath });
            } catch(error) {
                throw error;
            }
        } else {
            throw new Error('Unable to retrieve file path');
        }
    }

    /**
     * Get the contents of a file
     * @param uri        The file URI
     * @param resolve    The promise resolve method
     */
    private static async getFileContents(uri: Uri): Promise<string> {
        if (uri) {
            return workspace.openTextDocument(uri).then((document) => {
                return document.getText();
            });
        } else {
            return window.activeTextEditor.document.getText();
        }
    }

    /**
     * Get the composite option(s) to build
     * @param text    The file contents to parse
     */
    private static async getCompositeOptions(fileContents: string): Promise<Array<any>> {
        const namespace = await this.getNamespace(fileContents);
        const composites = await this.getComposites(fileContents);
        return [ namespace, composites ];
    }

    /**
     * Gets the SPL namespace. Prompts the user for manual input
     * if a namespace is not defined or cannot be detected.
     * @param fileContents    The file contents to parse
     */
    private static async getNamespace(fileContents: string): Promise<string> {
        let match = null;
        let namespace = '';
        while ((match = SplBuilder.SPL_NAMESPACE_REGEX.exec(fileContents)) !== null) {
            if (namespace === '') {
                namespace = match[1];
            } else {
                throw new Error('A single namespace must be defined');
            }
        }

        if (namespace !== '') {
            return namespace;
        } else {
            return this.promptForInput('namespace') as Promise<string>;
        }
    }

    /**
     * Gets the SPL composite(s). Prompts the user for manual input
     * if a composite is not defined or cannot be detected.
     * @param fileContents    The file contents to parse
     */
    private static async getComposites(fileContents: string): Promise<Array<string>> {
        let match = null;
        let composites = [];
        while ((match = SplBuilder.SPL_MAIN_COMPOSITE_REGEX.exec(fileContents)) !== null) {
            composites.push(match[1]);
        }

        if (composites.length) {
            return composites;
        } else {
            return this.promptForInput('composite') as Promise<Array<string>>;
        }
    }

    /**
     * Prompts the user to specify a namespace or composite
     * @param type    The input type
     */
    private static async promptForInput(type: string): Promise<string|Array<string>> {
        SplLogger.debug(`A ${type} is not defined or cannot be detected. Prompting for user input.`);
        const capitalizedType = type.charAt(0).toUpperCase() + type.substring(1).toLowerCase();
        return window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: `your${capitalizedType}Name`,
            prompt: `A ${type} is not defined or cannot be detected. Please manually enter a ${type} name to build.`
        }).then((input: string) => {
            if (input && input.trim() !== '') {
                return type === 'namespace' ? input : [input];
            } else {
                throw new Error(`Build canceled, a ${type} was not specified`);
            }
        });
    }

    /**
     * Get the main composite to build. Prompt the user to select if
     * there are multiple composites defined and there is no Makefile.
     * @param appRoot       The application root path
     * @param namespace     The defined namespace
     * @param composites    The defined composites
     */
    private static async getCompositeToBuild(appRoot: string, namespace: string, composites: Array<string>): Promise<string> {
        const makefileExists = fs.existsSync(`${appRoot}/Makefile`) || fs.existsSync(`${appRoot}/makefile`);
        if (makefileExists) {
            SplLogger.warn('Using the project\'s Makefile for the build', true);
        }

        if (composites.length === 1) {
            return `${namespace}::${composites[0]}`;
        } else {
            if (fs.existsSync(`${appRoot}/Makefile`) || fs.existsSync(`${appRoot}/makefile`)) {
                return `${namespace}::${composites[0]}`;
            } else {
                return window.showQuickPick(composites, {
                    ignoreFocusOut: true,
                    placeHolder: 'Select the main composite to build...'
                }).then(composite => {
                    if (composite) {
                        return `${namespace}::${composite}`;
                    } else {
                        throw new Error(`Build canceled, a main composite was not selected`);
                    }
                });
            }
        }
    }

    /**
     * Get the toolkits directory. Prompt the user to select
     * if there configuration setting is not defined.
     */
    private static async getToolkitsDir(): Promise<string> {
        const setting = SplConfig.getSetting(Config.TOOLKITS_PATH);
        if (setting.trim() !== '') {
            return setting;
        } else {
            return window.showOpenDialog({
                'canSelectFiles': false,
                'canSelectFolders': true,
                'canSelectMany': false,
                'openLabel': 'Set as IBM Streams toolkits directory'
            }).then((selected: Uri[]) => {
                let dir = null;
                if (selected && selected.length === 1) {
                    dir = selected[0].fsPath;
                    SplConfig.setSetting(Config.TOOLKITS_PATH, dir);
                }
                return dir;
            });
        }
    }
}
