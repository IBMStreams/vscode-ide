'use strict';

import { workspace, ConfigurationChangeEvent, ConfigurationTarget, ExtensionContext, Memento, WorkspaceConfiguration } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';

import { Settings, SplLogger } from '.';

export class SplConfig {
    private static _context: ExtensionContext;
    private static _client: LanguageClient;

    /**
     * Perform initial configuration
     * @param context    The extension context
     * @param client     The language client
     */
    public static configure(context: ExtensionContext, client: LanguageClient): void {
        this._context = context;
        this._client = client;

        this.customizeWorkbench();

        // Store initial settings
        const initialSettings = this.getCurrentSettings();
        this.setState(Settings.ID, initialSettings);

        this.watchSettings();
    }

    private static customizeWorkbench() {
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
     * Get all current global configuration settings
     */
    public static getCurrentSettings(): object {
        return {
            [Settings.TOOLKITS_PATH]: this.getSetting(Settings.TOOLKITS_PATH),
            [Settings.STREAMING_ANALYTICS_CREDENTIALS]: this.getSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS)
        };
    }

    /**
     * Get all old global configuration settings
     */
    private static getOldSettings(): object {
        return {
            [Settings.TOOLKITS_PATH]: this.getState(Settings.TOOLKITS_PATH),
            [Settings.STREAMING_ANALYTICS_CREDENTIALS]: this.getState(Settings.STREAMING_ANALYTICS_CREDENTIALS)
        };
    }

    /**
     * Get the value for a global configuration setting
     * @param setting    The configuration setting
     */
    public static getSetting(setting: string): any {
        return this.getConfig().get(setting);
    }

    /**
     * Set the value for a global configuration setting
     * @param setting    The configuration setting
     * @param value      The new value
     */
    public static setSetting(setting: string, value: any): Thenable<void> {
        return this.getConfig().update(setting, value, ConfigurationTarget.Global);
    }

    /**
     * Get the configuration
     */
    private static getConfig(): WorkspaceConfiguration {
        return workspace.getConfiguration(Settings.ID);
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
     * Get the storage
     */
    private static getStorage(): Memento {
        return this._context.globalState;
    }

    /**
     * Create an event listener to detect when the user modifies configuration settings
     */
    private static watchSettings(): void {
        this._context.subscriptions.push(workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(Settings.ID)) {
                // Send all settings to the language server
                this._client.sendNotification(DidChangeConfigurationNotification.type, {
                    settings: {
                        oldValue: this.getOldSettings(),
                        newValue: this.getCurrentSettings()
                    }
                });

                let changedSetting = null;
                if (event.affectsConfiguration(`${Settings.ID}.${Settings.TOOLKITS_PATH}`)) {
                    changedSetting = Settings.TOOLKITS_PATH;
                } else if (event.affectsConfiguration(`${Settings.ID}.${Settings.STREAMING_ANALYTICS_CREDENTIALS}`)) {
                    changedSetting = Settings.STREAMING_ANALYTICS_CREDENTIALS;
                }

                if (changedSetting) {
                    const oldValue = SplConfig.getState(changedSetting) === '' ? '\"\"' : SplConfig.getState(changedSetting);
                    const newValue = SplConfig.getSetting(changedSetting) === '' ? '\"\"' : SplConfig.getSetting(changedSetting);
                    const formatValue = value => typeof value === 'object' ? JSON.stringify(value) : value;
                    SplLogger.debug(null, `The ${changedSetting} configuration setting was changed from: ${formatValue(oldValue)} to ${formatValue(newValue)}`);
                    SplConfig.setState(changedSetting, newValue);
                }
            }
        }));
    }
}
