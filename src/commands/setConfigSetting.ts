import { ExtensionContext, window } from 'vscode';
import { Commands, IBaseCommand } from '.';
import { Configuration, Logger, Settings } from '../utils';

/**
 * Command that allows a user to set a configuration setting
 */
export class SetConfigSettingCommand implements IBaseCommand {
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
    public execute(context: ExtensionContext, ...args: any[]): any {
        const callbackFn = args[0][0] ? args[0][0] : null;
        return this._promptForConfigurationValue(callbackFn);
    }

    /**
     * Prompt the user to input a value for a configuration setting.
     * @param callbackFn    The callback function to execute after setting the value
     */
    private async _promptForConfigurationValue(callbackFn: (setting: any) => any): Promise<void> {
        Logger.info(null, `Received request to set the configuration setting: ${this.commandName}`);

        let name = null;
        let prompt = null;
        let placeHolder = null;
        let options = null;
        switch (this.commandName) {
            case Commands.SET_SERVICE_CREDENTIALS:
                name = Settings.STREAMING_ANALYTICS_CREDENTIALS;
                prompt = 'Provide credentials for an IBM Streaming Analytics service';
                placeHolder = '{ "apikey": ..., "v2_rest_url": ... }';
                break;
            case Commands.SET_ICP4D_URL:
                name = Settings.ICP4D_URL;
                prompt = 'Provide your IBM Cloud Private for Data URL';
                placeHolder = 'https://HOST:PORT';
                break;
            case Commands.SET_TOOLKITS_PATH:
                name = Settings.TOOLKITS_PATH;
                prompt = 'Provide paths to directories, comma or semicolon separated, containing IBM Streams toolkits';
                placeHolder = '/path/to/first/toolkits/directory;/path/to/second/toolkits/directory';
                break;
            case Commands.SET_TARGET_VERSION:
                name = Settings.TARGET_VERSION;
                placeHolder = 'Select the IBM Streams version to target for builds and submissions';
                options = Object.keys(Settings.TARGET_VERSION_OPTION).map((key: string) => Settings.TARGET_VERSION_OPTION[key]);
                break;
        }

        if (name && placeHolder) {
            if (options) {
                return window.showQuickPick(options, {
                    ignoreFocusOut: true,
                    placeHolder
                }).then(async (selection: string) => {
                    if (typeof selection === 'string') {
                        try {
                            await Configuration.setSetting(name, selection);
                            if (callbackFn) {
                                const setting = Configuration.getSetting(name);
                                callbackFn(setting);
                            }
                        } catch (error) {
                            throw error;
                        }
                    }
                });
            } else {
                return window.showInputBox({
                    ignoreFocusOut: true,
                    prompt,
                    placeHolder
                }).then(async (input: string) => {
                    if (typeof input === 'string') {
                        try {
                            input = input.trim();
                            if (this.commandName === Commands.SET_SERVICE_CREDENTIALS) {
                                input = JSON.parse(input);
                            }
                            if (input === 'null') {
                                input = null;
                            }
                            await Configuration.setSetting(name, input);
                            if (callbackFn) {
                                const setting = Configuration.getSetting(name);
                                callbackFn(setting);
                            }
                        } catch (error) {
                            throw error;
                        }
                    }
                });
            }
        } else {
            throw new Error('The command name is not supported');
        }
    }
}
