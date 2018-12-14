'use strict';

import { window, ExtensionContext, Uri } from 'vscode';

import { BaseCommand } from './base';
import { Commands } from './commands';
import { SplBuild } from '../utils';

export class BuildCommand implements BaseCommand {
    private _buildType: number;

    /**
     * Initialize the command
     * @param commandName    The name of the command
     * @param buildType      The build type
     */
    constructor(public commandName: string, buildType?: number) {
        this._buildType = typeof buildType === 'number' ? buildType : null;
    }

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    execute(context: ExtensionContext, ...args: any[]): Promise<void> {
        let uri = null;
        if (args[0] && args[0][0] instanceof Uri) {
            uri = args[0][0];
        } else {
            const editor = window.activeTextEditor;
            uri = editor.document.uri;
        }

        switch(this.commandName) {
            case Commands.BUILD_DOWNLOAD:
            case Commands.BUILD_SUBMIT:
                return SplBuild.build(uri, this._buildType)
                    .catch(error => { throw error; });
            case Commands.BUILD_MAKE_DOWNLOAD:
            case Commands.BUILD_MAKE_SUBMIT:
                return SplBuild.buildMake(uri, this._buildType)
                    .catch(error => { throw error; });
            case Commands.SUBMIT:
                return SplBuild.submit(uri)
                    .catch(error => { throw error; });
        }
    }
}
