import { ConfigurationChangeEvent, ConfigurationTarget, ExtensionContext, Memento, workspace, WorkspaceConfiguration } from 'vscode';
import { Constants, Settings, SplLogger } from '.';

export class SplConfig {
    private static _context: ExtensionContext;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this._context = context;

        this.customizeWorkbench();

        // Store initial settings
        const initialSettings = this.getCurrentSettings();
        Object.keys(initialSettings).forEach((key: string) => this.setState(key, initialSettings[key]));

        this.watchSettings();
    }

    /**
     * Customize global configuration settings for Streams color themes
     */
    private static customizeWorkbench(): void {
        workspace.getConfiguration('workbench').update('colorCustomizations', {
            '[Streams Light]': {
                'editor.selectionBackground': '#E2F5FF',
                'editorBracketMatch.background': '#7D7D7D66',
                'editorCursor.foreground': '#000000'
            },
            '[Streams Dark]': {
                'editor.selectionBackground': '#2F4F4F',
                'editorBracketMatch.background': '#7D7D7D66',
                'editorCursor.foreground': '#FFFFFF'
            }
        }, ConfigurationTarget.Global);
    }

    /**
     * Get all current configuration settings
     */
    public static getCurrentSettings(): object {
        return {
            [`${Constants.EXTENSION_NAME}.${Settings.ICP4D_URL}`]: this.getSetting(Settings.ICP4D_URL),
            [`${Constants.EXTENSION_NAME}.${Settings.STREAMING_ANALYTICS_CREDENTIALS}`]: this.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS),
            [`${Constants.EXTENSION_NAME}.${Settings.TARGET_VERSION}`]: this.getSetting(Settings.TARGET_VERSION),
            [`${Constants.EXTENSION_NAME}.${Settings.TOOLKITS_PATH}`]: this.getSetting(Settings.TOOLKITS_PATH),
            [`${Constants.EXTENSION_NAME}.${Settings.USE_ICP4D_MASTER_NODE_HOST}`]: this.getSetting(Settings.USE_ICP4D_MASTER_NODE_HOST),
            [`${Constants.SPL}.${Settings.TRACE_SERVER}`]: this.getSetting(Settings.TRACE_SERVER, Constants.SPL)
        };
    }

    /**
     * Get the configuration
     * @param id    The configuration setting parent
     */
    private static getConfig(id?: string): WorkspaceConfiguration {
        return workspace.getConfiguration(id ? id : Constants.EXTENSION_NAME);
    }

    /**
     * Get the value for a configuration setting
     * @param setting    The configuration setting
     * @param id         The configuration setting parent
     */
    public static getSetting(setting: string, id?: string): any {
        return this.getConfig(id).get(setting);
    }

    /**
     * Inspect a configuration setting
     * @param setting    The configuration setting
     * @param id         The configuration setting parent
     */
    public static inspectSetting(setting: string, id?: string): any {
        return this.getConfig(id).inspect(setting);
    }

    /**
     * Set the value for a configuration setting
     * @param setting    The configuration setting
     * @param value      The new value
     * @param id         The configuration setting parent
     */
    public static setSetting(setting: string, value: any, id?: string): Thenable<any> {
        const config = this.getConfig(id);
        const inspect = this.inspectSetting(setting);
        const { defaultValue, globalValue, workspaceValue, workspaceFolderValue } = inspect;

        if (workspaceFolderValue !== undefined) {
            if (value === workspaceFolderValue) {
                return Promise.resolve();
            }

            return config.update(setting, value, ConfigurationTarget.WorkspaceFolder);
        }

        if (workspaceValue !== undefined) {
            if (value === workspaceValue) {
                return Promise.resolve();
            }

            return config.update(setting, value, ConfigurationTarget.Workspace);
        }

        if (globalValue === value || (globalValue === undefined && value === defaultValue)) {
            return Promise.resolve();
        }

        return config.update(setting, value, ConfigurationTarget.Global);
    }

    /**
     * Get the storage
     */
    private static getStorage(): Memento {
        return this._context.globalState;
    }

    /**
     * Get the value for a key in storage
     * @param key    The key
     */
    public static getState(key: string): any {
        return this.getStorage().get(key);
    }

    /**
     * Set the value for a key in storage
     * @param key      The key
     * @param value    The new value
     */
    public static setState(key: string, value: any): Thenable<void> {
        return this.getStorage().update(key, value);
    }

    /**
     * Create an event listener to detect when the user modifies configuration settings
     */
    private static watchSettings(): void {
        this._context.subscriptions.push(workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
            if (!event.affectsConfiguration(Constants.EXTENSION_NAME) && !event.affectsConfiguration(Constants.SPL)) {
                return;
            }

            let changedSettingId = Constants.EXTENSION_NAME;
            let changedSettingName = null;
            if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.ICP4D_URL}`)) {
                changedSettingName = Settings.ICP4D_URL;
            } else if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.STREAMING_ANALYTICS_CREDENTIALS}`)) {
                changedSettingName = Settings.STREAMING_ANALYTICS_CREDENTIALS;
            } else if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.TARGET_VERSION}`)) {
                changedSettingName = Settings.TARGET_VERSION;
            } else if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.TOOLKITS_PATH}`)) {
                changedSettingName = Settings.TOOLKITS_PATH;
            } else if (event.affectsConfiguration(`${Constants.EXTENSION_NAME}.${Settings.USE_ICP4D_MASTER_NODE_HOST}`)) {
                changedSettingName = Settings.USE_ICP4D_MASTER_NODE_HOST;
            } else if (event.affectsConfiguration(`${Constants.SPL}.${Settings.TRACE_SERVER}`)) {
                changedSettingId = Constants.SPL;
                changedSettingName = Settings.TRACE_SERVER;
            }

            if (changedSettingName) {
                const changedSettingFull = `${changedSettingId}.${changedSettingName}`;
                const oldValue = SplConfig.getState(changedSettingFull) === '' ? '\"\"' : SplConfig.getState(changedSettingFull);
                const newValue = SplConfig.getSetting(changedSettingName, changedSettingId) === '' ? '\"\"' : SplConfig.getSetting(changedSettingName, changedSettingId);
                const formatValue = (value: any) => typeof value === 'object' ? `\n${JSON.stringify(value, null, 4)}` : ` ${value}`;
                const whitespaceValue = typeof oldValue === 'object' ? '\n\n' : `\n`;
                SplLogger.info(null, `The ${changedSettingFull} configuration setting was changed:\nPrevious value:${formatValue(oldValue)}${whitespaceValue}Current value: ${formatValue(newValue)}`);
                SplConfig.setState(changedSettingFull, newValue);
            }
        }));
    }
}
