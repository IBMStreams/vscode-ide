'use strict';

import { ExtensionContext, Uri } from 'vscode';

import { Command } from './command';
import { SplBuild } from '../build';

export class SplBuildCommand implements Command {
    private _buildType: number;

    /**
     * Initialize the command
     * @param commandName    The name of the command
     * @param buildType      The build type
     */
    constructor(public commandName: string, buildType: number) {
        this._buildType = buildType;
    }

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    execute(context: ExtensionContext, ...args: any[]): Promise<void> {
        if (args[0] && args[0][0] instanceof Uri) {
            const uri = args[0][0];
            return SplBuild.handle(uri, this._buildType)
                .catch(error => { throw error; });
        }
    }
}
