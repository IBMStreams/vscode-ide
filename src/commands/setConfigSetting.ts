'use strict';

import { window, ExtensionContext } from 'vscode';

import { BaseCommand } from './base';
import { Commands } from './commands';
import { Settings, SplConfig, SplLogger } from '../utils';

export class SetConfigSettingCommand implements BaseCommand {
    /**
     * Initialize the command
     * @param commandName    The name of the command
     */
    constructor(public commandName: string) {}

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    execute(context: ExtensionContext, ...args: any[]): any {
        const callbackFn = args[0][0] ? args[0][0] : null;
        return this.promptForConfigurationValue(callbackFn);
    }

     /**
     * Prompt the user to input a value for a configuration setting.
     * @param callbackFn    The callback function to execute after setting the value
     */
    private async promptForConfigurationValue(callbackFn: Function): Promise<void> {
        SplLogger.info(null, `Received request to set the configuration setting: ${this.commandName}`);

        let config = null, prompt = null, placeHolder = null;
        switch(this.commandName) {
            case Commands.SET_SERVICE_CREDENTIALS:
                config = Settings.STREAMING_ANALYTICS_CREDENTIALS;
                prompt = 'Provide credentials for an IBM Streaming Analytics service';
                placeHolder = '{ "apikey": ..., "v2_rest_url": ... }';
                break;
            case Commands.SET_TOOLKITS_PATH:
                config = Settings.TOOLKITS_PATH;
                prompt = 'Provide paths to directories, comma or semicolon separated, containing IBM Streams toolkits';
                placeHolder = '/path/to/first/toolkit/directory;/path/to/second/toolkit/directory';
                break;
        }

        if (config && prompt && placeHolder) {
            return window.showInputBox({
                ignoreFocusOut: true,
                prompt: prompt,
                placeHolder: placeHolder
            }).then((input: string) => {
                if (typeof input === 'string') {
                    try {
                        input = input.trim();
                        if (this.commandName === Commands.SET_SERVICE_CREDENTIALS) {
                            input = JSON.parse(input);
                        }
                        if (input === 'null') {
                            input = null;
                        }
                        SplConfig.setSetting(config, input).then(() => {
                            if (callbackFn) {
                                const setting = SplConfig.getSetting(config);
                                callbackFn(setting);
                            }
                        });
                    } catch(error) {
                        throw error;
                    }
                }
            });
        } else {
            throw new Error('The command name is not supported');
        }
    }
}
