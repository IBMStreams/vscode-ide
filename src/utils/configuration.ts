import * as _ from 'lodash';
import {
    ConfigurationChangeEvent,
    ConfigurationTarget,
    ExtensionContext,
    Memento,
    workspace
} from 'vscode';
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';
import { Logger, Settings } from '.';
import { StreamsToolkitsUtils } from '../build/v5/util';
import SplLanguageClient from '../languageClient';

/**
 * Manages configuration settings and global state
 */
export default class Configuration {
    private static context: ExtensionContext;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this.context = context;

        this.customizeWorkbench();
        this.migrateOldSettings();

        // Store initial settings
        const initialSettings = this.getSettingsSnapshot();
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
     * Migrate old settings that have updated names
     */
    private static migrateOldSettings(): void {
        // Migrate settings that have changed names
        const settingNamesMap = {
            'ibm-streams.streamingAnalyticsCredentials': {
                name: Settings.STREAMING_ANALYTICS_CREDENTIALS,
                default: null
            },
            'ibm-streams.toolkitsPath': {
                name: Settings.TOOLKIT_PATHS,
                default: Settings.TOOLKIT_PATHS_DEFAULT
            },
            'spl.trace.server': {
                name: Settings.TRACE_SERVER,
                default: Settings.TRACE_SERVER_DEFAULT
            }
        };
        _.forEach(settingNamesMap, (newSetting: any, oldName: string) => {
            const oldSettingValue = this.getSetting(oldName);
            const newSettingValue = this.getSetting(newSetting.name);
            if (oldSettingValue && _.isEqual(newSettingValue, newSetting.default)) {
                this.setSetting(newSetting.name, this.getSetting(oldName));
                this.setSetting(oldName, null);
            }
        });

        // Migrate settings that have changed values
        const settingValuesMap = {
            [Settings.TARGET_VERSION]: {
                oldValue: 'IBM Cloud Private for Data: Streams add-on',
                newValue: Settings.TARGET_VERSION_OPTION.V5
            }
        };
        _.forEach(settingValuesMap, (settingValues: any, settingName: string) => {
            const settingValue = this.getSetting(settingName);
            if (_.isEqual(settingValue, settingValues.oldValue)) {
                this.setSetting(settingName, settingValues.newValue);
            }
        });
    }

    /**
     * Get a snapshot of the configuration settings
     */
    private static getSettingsSnapshot(): object {
        return {
            [Settings.ICP4D_URL]: this.getSetting(Settings.ICP4D_URL),
            [Settings.ICP4D_USE_MASTER_NODE_HOST]: this.getSetting(Settings.ICP4D_USE_MASTER_NODE_HOST),
            [Settings.REQUEST_TIMEOUT]: this.getSetting(Settings.REQUEST_TIMEOUT),
            [Settings.STREAMING_ANALYTICS_CREDENTIALS]: this.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS),
            [Settings.TARGET_VERSION]: this.getSetting(Settings.TARGET_VERSION),
            [Settings.TOOLKIT_PATHS]: this.getSetting(Settings.TOOLKIT_PATHS),
            [Settings.TRACE_SERVER]: this.getSetting(Settings.TRACE_SERVER)
        };
    }

    /**
     * Create an event listener to detect when the user modifies configuration settings
     */
    private static watchSettings(): void {
        this.context.subscriptions.push(workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
            if (!event.affectsConfiguration(Settings.SECTION_ID)) {
                return;
            }

            let changedSettingName = null;
            if (event.affectsConfiguration(Settings.ICP4D_URL)) {
                changedSettingName = Settings.ICP4D_URL;
            } else if (event.affectsConfiguration(Settings.ICP4D_USE_MASTER_NODE_HOST)) {
                changedSettingName = Settings.ICP4D_USE_MASTER_NODE_HOST;
            } else if (event.affectsConfiguration(Settings.REQUEST_TIMEOUT)) {
                changedSettingName = Settings.REQUEST_TIMEOUT;
            } else if (event.affectsConfiguration(Settings.STREAMING_ANALYTICS_CREDENTIALS)) {
                changedSettingName = Settings.STREAMING_ANALYTICS_CREDENTIALS;
            } else if (event.affectsConfiguration(Settings.TARGET_VERSION)) {
                changedSettingName = Settings.TARGET_VERSION;
            } else if (event.affectsConfiguration(Settings.TOOLKIT_PATHS)) {
                changedSettingName = Settings.TOOLKIT_PATHS;

                // Send added and removed toolkits to the LSP server
                const currentToolkitPathsSetting = Configuration.getSetting(changedSettingName);
                const previousToolkitPathsSetting = Configuration.getState(changedSettingName);
                const { addedToolkitPaths, removedToolkitNames } = StreamsToolkitsUtils.getChangedLocalToolkits(previousToolkitPathsSetting, currentToolkitPathsSetting);
                if (addedToolkitPaths && addedToolkitPaths.length) {
                    const addParam = StreamsToolkitsUtils.getLangServerParamForAddToolkits(addedToolkitPaths);
                    SplLanguageClient.getClient().sendNotification(DidChangeConfigurationNotification.type.method, addParam);
                }
                if (removedToolkitNames && removedToolkitNames.length) {
                    const removeParam = StreamsToolkitsUtils.getLangServerParamForRemoveToolkits(removedToolkitNames);
                    SplLanguageClient.getClient().sendNotification(DidChangeConfigurationNotification.type.method, removeParam);
                }
            } else if (event.affectsConfiguration(Settings.TRACE_SERVER)) {
                changedSettingName = Settings.TRACE_SERVER;
            }

            if (changedSettingName) {
                const oldValue = Configuration.getState(changedSettingName) === '' ? '""' : Configuration.getState(changedSettingName);
                const newValue = Configuration.getSetting(changedSettingName) === '' ? '""' : Configuration.getSetting(changedSettingName);
                const formatValue = (value: any): string => (typeof value === 'object' ? `\n${JSON.stringify(value, null, 4)}` : ` ${value}`);
                const whitespaceValue = typeof oldValue === 'object' ? '\n\n' : '\n';
                Logger.info(null, `The ${changedSettingName} configuration setting was changed:\nPrevious value:${formatValue(oldValue)}${whitespaceValue}Current value: ${formatValue(newValue)}`);
                Configuration.setState(changedSettingName, newValue);
            }
        }));
    }

    /**
     * Get the value for a configuration setting
     * @param name    The configuration setting name
     */
    public static getSetting(name: string): any {
        return workspace.getConfiguration().get(name);
    }

    /**
     * Set the value for a configuration setting
     * @param name     The configuration setting name
     * @param value    The new value
     */
    public static setSetting(name: string, value: any): Thenable<any> {
        const configuration = workspace.getConfiguration();
        const inspect = this.inspectSetting(name);
        const { defaultValue, globalValue, workspaceValue, workspaceFolderValue } = inspect;

        if (workspaceFolderValue !== undefined) {
            if (value === workspaceFolderValue) {
                return Promise.resolve();
            }

            return configuration.update(name, value, ConfigurationTarget.WorkspaceFolder);
        }

        if (workspaceValue !== undefined) {
            if (value === workspaceValue) {
                return Promise.resolve();
            }

            return configuration.update(name, value, ConfigurationTarget.Workspace);
        }

        if (globalValue === value || (globalValue === undefined && value === defaultValue)) {
            return Promise.resolve();
        }

        return configuration.update(name, value, ConfigurationTarget.Global);
    }

    /**
     * Inspect a configuration setting
     * @param name    The configuration setting name
     */
    private static inspectSetting(name: string): any {
        return workspace.getConfiguration().inspect(name);
    }

    /**
     * Get the value for a key in the global state
     * @param key    The key
     */
    public static getState(key: string): any {
        return this.getMemento().get(key);
    }

    /**
     * Set the value for a key in the global state
     * @param key      The key
     * @param value    The new value
     */
    public static setState(key: string, value: any): Thenable<void> {
        return this.getMemento().update(key, value);
    }

    /**
     * Get the memento object
     */
    private static getMemento(): Memento {
        return this.context.globalState;
    }
}
