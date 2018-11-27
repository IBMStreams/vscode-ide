'use strict';

import { window, ExtensionContext, Uri } from 'vscode';

import { BaseCommand } from './command';
import { Build } from '../build';

export enum Command {
    BUILD_DOWNLOAD = 'ibm-streams.buildDownload',
    BUILD_SUBMIT = 'ibm-streams.buildSubmit',
    BUILD_MAKE_DOWNLOAD = 'ibm-streams.buildMakeDownload',
    BUILD_MAKE_SUBMIT = 'ibm-streams.buildMakeSubmit',
    SUBMIT = 'ibm-streams.submit'
}

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
            case Command.BUILD_DOWNLOAD:
            case Command.BUILD_SUBMIT:
                return Build.build(uri, this._buildType)
                    .catch(error => { throw error; });
            case Command.BUILD_MAKE_DOWNLOAD:
            case Command.BUILD_MAKE_SUBMIT:
                return Build.buildMake(uri, this._buildType)
                    .catch(error => { throw error; });
            case Command.SUBMIT:
                return Build.submit(uri)
                    .catch(error => { throw error; });
        }
    }
}
