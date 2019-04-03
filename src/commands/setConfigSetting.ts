import { ExtensionContext, window } from 'vscode';
import { Settings, SplConfig, SplLogger } from '../utils';
import { IBaseCommand } from './base';
import { Commands } from './commands';

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
        return this.promptForConfigurationValue(callbackFn);
    }

    /**
     * Prompt the user to input a value for a configuration setting.
     * @param callbackFn    The callback function to execute after setting the value
     */
    private async promptForConfigurationValue(callbackFn: (setting: any) => any): Promise<void> {
        SplLogger.info(null, `Received request to set the configuration setting: ${this.commandName}`);

        let config = null;
        let prompt = null;
        let placeHolder = null;
        let options = null;
        switch (this.commandName) {
            case Commands.SET_SERVICE_CREDENTIALS:
                config = Settings.STREAMING_ANALYTICS_CREDENTIALS;
                prompt = 'Provide credentials for an IBM Streaming Analytics service';
                placeHolder = '{ "apikey": ..., "v2_rest_url": ... }';
                break;
            case Commands.SET_ICP4D_URL:
                config = Settings.ICP4D_URL;
                prompt = 'Provide your IBM Cloud Private for Data URL';
                placeHolder = 'https://HOST:PORT';
                break;
            case Commands.SET_TOOLKITS_PATH:
                config = Settings.TOOLKITS_PATH;
                prompt = 'Provide paths to directories, comma or semicolon separated, containing IBM Streams toolkits';
                placeHolder = '/path/to/first/toolkits/directory;/path/to/second/toolkits/directory';
                break;
            case Commands.SET_TARGET_VERSION:
                config = Settings.TARGET_VERSION;
                placeHolder = 'Select the IBM Streams version to target for builds and submissions';
                options = [
                    Settings.TARGET_VERSION_OPTION.V4,
                    Settings.TARGET_VERSION_OPTION.V5
                ];
                break;
        }

        if (config && placeHolder) {
            if (options) {
                return window.showQuickPick(options, {
                    ignoreFocusOut: true,
                    placeHolder
                }).then((selection: string) => {
                    if (typeof selection === 'string') {
                        try {
                            SplConfig.setSetting(config, selection).then(() => {
                                if (callbackFn) {
                                    const setting = SplConfig.getSetting(config);
                                    callbackFn(setting);
                                }
                            });
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
