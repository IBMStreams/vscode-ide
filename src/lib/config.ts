'use strict';

import { workspace, ConfigurationChangeEvent, ConfigurationTarget, ExtensionContext, Memento, WorkspaceConfiguration } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';

import { SplLogger } from './logger';

export const CONFIG_ID = 'ibm-streams';
export enum Config {
    STREAMING_ANALYTICS_CREDENTIALS = 'streamingAnalyticsCredentials',
    TOOLKITS_PATH = 'toolkitsPath'
}

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

        // Store initial settings
        const initialSettings = this.getCurrentSettings();
        this.setState(CONFIG_ID, initialSettings);

        this.watchSettings();
    }

    /**
     * Get all current global configuration settings
     */
    public static getCurrentSettings(): object {
        return {
            [Config.TOOLKITS_PATH]: this.getSetting(Config.TOOLKITS_PATH),
            [Config.STREAMING_ANALYTICS_CREDENTIALS]: this.getSetting(Config.STREAMING_ANALYTICS_CREDENTIALS)
        };
    }

    /**
     * Get all old global configuration settings
     */
    private static getOldSettings(): object {
        return {
            [Config.TOOLKITS_PATH]: this.getState(Config.TOOLKITS_PATH),
            [Config.STREAMING_ANALYTICS_CREDENTIALS]: this.getState(Config.STREAMING_ANALYTICS_CREDENTIALS)
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
        return workspace.getConfiguration(CONFIG_ID);
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
            if (event.affectsConfiguration(CONFIG_ID)) {
                // Send all settings to the language server
                this._client.sendNotification(DidChangeConfigurationNotification.type, {
                    settings: {
                        oldValue: this.getOldSettings(),
                        newValue: this.getCurrentSettings()
                    }
                });

                let changedSetting = null;
                if (event.affectsConfiguration(`${CONFIG_ID}.${Config.TOOLKITS_PATH}`)) {
                    changedSetting = Config.TOOLKITS_PATH;
                } else if (event.affectsConfiguration(`${CONFIG_ID}.${Config.STREAMING_ANALYTICS_CREDENTIALS}`)) {
                    changedSetting = Config.STREAMING_ANALYTICS_CREDENTIALS;
                }

                if (changedSetting) {
                    const oldValue = SplConfig.getState(changedSetting) === '' ? '\"\"' : SplConfig.getState(changedSetting);
                    const newValue = SplConfig.getSetting(changedSetting) === '' ? '\"\"' : SplConfig.getSetting(changedSetting);
                    SplLogger.debug(`The ${changedSetting} configuration setting was changed from: ${oldValue} to ${newValue}`);
                    SplConfig.setState(changedSetting, newValue);
                }
            }
        }));
    }
}
