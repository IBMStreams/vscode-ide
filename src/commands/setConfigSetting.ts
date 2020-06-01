import { ExtensionContext, window } from 'vscode';
import { Commands, BaseCommand } from '.';
import { Configuration, Logger, Settings } from '../utils';

/**
 * Command that allows a user to set a configuration setting
 */
export default class SetConfigSettingCommand implements BaseCommand {
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
        switch (this.commandName) {
            case Commands.ENVIRONMENT.TOOLKIT_PATHS_SET:
                name = Settings.ENV_TOOLKIT_PATHS;
                prompt = 'Provide paths to directories, comma or semicolon separated, containing additional IBM Streams toolkits';
                placeHolder = '/path/to/first/toolkits/directory;/path/to/second/toolkits/directory';
                break;
            default:
                break;
        }

        if (name && placeHolder) {
            return window.showInputBox({
                ignoreFocusOut: true,
                prompt,
                placeHolder
            }).then(async (input: string) => {
                if (typeof input === 'string') {
                    let inputValue = input;
                    inputValue = input.trim();
                    if (inputValue === 'null') {
                        inputValue = null;
                    }
                    await Configuration.setSetting(name, inputValue);
                    const settingValue = Configuration.getSetting(name);
                    if (callbackFn) {
                        callbackFn(settingValue);
                    }
                    return settingValue;
                }
                return null;
            });
        }

        throw new Error('The command name is not supported');
    }
}
