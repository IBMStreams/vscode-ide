import {
  EditorAction,
  LogLevel,
  Registry,
  store,
  ToolkitUtils
} from '@ibmstreams/common';
import _cloneDeep from 'lodash/cloneDeep';
import _forEach from 'lodash/forEach';
import _isEqual from 'lodash/isEqual';
import * as path from 'path';
import {
  ConfigurationChangeEvent,
  ConfigurationTarget,
  ExtensionContext,
  Memento,
  workspace
} from 'vscode';
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';
import { EXTENSION_ID, Settings } from '.';
import SplLanguageClient from '../languageClient';

/**
 * Manages configuration settings and global state
 */
export default class Configuration {
  private static context: ExtensionContext;

  /**
   * Perform initial configuration
   * @param context the extension context
   */
  public static configure(context: ExtensionContext): void {
    this.context = context;

    this.customizeSettings(context);
    this.migrateOldSettings();

    // Store initial settings
    const initialSettings = this.getSettingsSnapshot();
    Object.keys(initialSettings).forEach((key: string) =>
      this.setState(key, initialSettings[key])
    );

    this.watchSettings();
  }

  /**
   * Customize global configuration settings
   * @param context the extension context
   */
  private static async customizeSettings(
    context: ExtensionContext
  ): Promise<void> {
    // Customize Streams color themes
    await workspace.getConfiguration('workbench').update(
      'colorCustomizations',
      {
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
      },
      ConfigurationTarget.Global
    );

    const filesConfiguration = workspace.getConfiguration('files');
    const fileAssociations = filesConfiguration.get('associations');
    // Customize *.cgt files to be associated with C++
    fileAssociations['*.cgt'] = 'cpp';
    // Customize ApplicationSet_*.properties files to be associated with XML
    fileAssociations['ApplicationSet_*.properties'] = 'xml';
    await filesConfiguration.update(
      'associations',
      fileAssociations,
      ConfigurationTarget.Global
    );

    // Set Java referenced libraries
    const javaProjectConfiguration = workspace.getConfiguration('java.project');
    const referencedLibraries = javaProjectConfiguration.get(
      'referencedLibraries'
    );
    let newReferencedLibraries: any = _cloneDeep(referencedLibraries);
    if (!Array.isArray(referencedLibraries)) {
      newReferencedLibraries = [];
    }
    const javaJarsPath = path.resolve(
      context.extensionPath,
      'jars',
      'java',
      '*.jar'
    );
    if (!newReferencedLibraries.includes(javaJarsPath)) {
      newReferencedLibraries.push(javaJarsPath);
    }
    await javaProjectConfiguration.update(
      'referencedLibraries',
      newReferencedLibraries,
      ConfigurationTarget.Global
    );
  }

  /**
   * Migrate old settings that have updated names or values
   */
  private static migrateOldSettings(): void {
    // Migrate settings that have changed names
    const settingNamesMap = {
      'ibm-streams.toolkitPaths': {
        name: Settings.ENV_TOOLKIT_PATHS,
        default: Settings.ENV_TOOLKIT_PATHS_DEFAULT
      },
      'ibm-streams.toolkitsPath': {
        name: Settings.ENV_TOOLKIT_PATHS,
        default: Settings.ENV_TOOLKIT_PATHS_DEFAULT
      },
      'spl.trace.server': {
        name: Settings.TRACE_SERVER,
        default: Settings.TRACE_SERVER_DEFAULT
      }
    };
    _forEach(settingNamesMap, (newSetting: any, oldName: string) => {
      const oldSettingValue = this.getSetting(oldName);
      const newSettingValue = this.getSetting(newSetting.name);
      if (
        oldSettingValue !== undefined &&
        _isEqual(newSettingValue, newSetting.default)
      ) {
        this.setSetting(newSetting.name, oldSettingValue);
      }
    });

    // Migrate settings that have changed values
    const logLevelSettingValue = this.getSetting(Settings.LOG_LEVEL);
    let newLogLevelSettingValue;
    if (logLevelSettingValue === 'off') {
      newLogLevelSettingValue = LogLevel.Info;
    } else if (logLevelSettingValue === 'debug') {
      newLogLevelSettingValue = LogLevel.Trace;
    }
    if (newLogLevelSettingValue) {
      this.setSetting(Settings.LOG_LEVEL, newLogLevelSettingValue);
    }
  }

  /**
   * Get a snapshot of the configuration settings
   */
  private static getSettingsSnapshot(): object {
    const settings = [
      Settings.ENV_REFRESH_INTERVAL,
      Settings.ENV_TIMEOUT_FOR_REQUESTS,
      Settings.ENV_TOOLKIT_PATHS,
      Settings.LOG_LEVEL,
      Settings.SERVER_MODE,
      Settings.SERVER_PORT,
      Settings.TRACE_SERVER
    ];
    const snapshot = {};
    settings.forEach((setting: string) => {
      snapshot[setting] = this.getSetting(setting);
    });
    return snapshot;
  }

  /**
   * Create an event listener to detect when the user modifies configuration settings
   */
  private static watchSettings(): void {
    this.context.subscriptions.push(
      workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
        if (!event.affectsConfiguration(EXTENSION_ID)) {
          return;
        }

        let changedSettingName = null;
        if (event.affectsConfiguration(Settings.ENV_REFRESH_INTERVAL)) {
          const refreshSetting = Configuration.getSetting(
            Settings.ENV_REFRESH_INTERVAL
          );
          if (
            refreshSetting &&
            typeof refreshSetting === 'number' &&
            refreshSetting >= 1
          ) {
            changedSettingName = Settings.ENV_REFRESH_INTERVAL;
          }
        } else if (
          event.affectsConfiguration(Settings.ENV_TIMEOUT_FOR_REQUESTS)
        ) {
          const timeoutSetting = Configuration.getSetting(
            Settings.ENV_TIMEOUT_FOR_REQUESTS
          );
          if (
            timeoutSetting &&
            typeof timeoutSetting === 'number' &&
            timeoutSetting >= 1
          ) {
            changedSettingName = Settings.ENV_TIMEOUT_FOR_REQUESTS;
          }
        } else if (event.affectsConfiguration(Settings.ENV_TOOLKIT_PATHS)) {
          changedSettingName = Settings.ENV_TOOLKIT_PATHS;

          // Send added and removed toolkits to the LSP server
          const currentToolkitPathsSetting = Configuration.getSetting(
            changedSettingName
          );
          const previousToolkitPathsSetting = Configuration.getState(
            changedSettingName
          );
          const {
            addedToolkitPaths,
            removedToolkitNames
          } = ToolkitUtils.getChangedLocalToolkits(
            previousToolkitPathsSetting,
            currentToolkitPathsSetting
          );
          if (addedToolkitPaths && addedToolkitPaths.length) {
            const addParam = ToolkitUtils.getLangServerParamForAddToolkits(
              addedToolkitPaths
            );
            SplLanguageClient.getClient().sendNotification(
              DidChangeConfigurationNotification.type.method,
              addParam
            );
          }
          if (removedToolkitNames && removedToolkitNames.length) {
            const removeParam = ToolkitUtils.getLangServerParamForRemoveToolkits(
              removedToolkitNames
            );
            SplLanguageClient.getClient().sendNotification(
              DidChangeConfigurationNotification.type.method,
              removeParam
            );
          }
        } else if (event.affectsConfiguration(Settings.LOG_LEVEL)) {
          changedSettingName = Settings.LOG_LEVEL;
          const logLevel = Configuration.getSetting(changedSettingName);
          const keys = Object.keys(LogLevel).filter(
            (x) => LogLevel[x] === logLevel
          );
          const logLevelKey = keys.length ? LogLevel[keys[0]] : LogLevel.Info;
          store.dispatch(EditorAction.setLogLevel(logLevelKey));
        } else if (event.affectsConfiguration(Settings.SERVER_MODE)) {
          changedSettingName = Settings.SERVER_MODE;
          SplLanguageClient.restart();
        } else if (event.affectsConfiguration(Settings.SERVER_PORT)) {
          changedSettingName = Settings.SERVER_PORT;
          // Restart only if the server mode is set to socket
          if (
            this.getSetting(Settings.SERVER_MODE) ===
            Settings.SERVER_MODE_VALUE.SOCKET
          ) {
            SplLanguageClient.restart();
          }
        } else if (event.affectsConfiguration(Settings.TRACE_SERVER)) {
          changedSettingName = Settings.TRACE_SERVER;
        } else if (event.affectsConfiguration(Settings.OSS_INPUT)) {
          changedSettingName = Settings.OSS_INPUT;
        } else if (event.affectsConfiguration(Settings.V43_SHARED_FOLDER)) {
          changedSettingName = Settings.V43_SHARED_FOLDER;
        } else if (event.affectsConfiguration(Settings.V43_IMAGE_NAME)) {
          changedSettingName = Settings.V43_IMAGE_NAME;
        } else if (event.affectsConfiguration(Settings.V43_VERSION)) {
          changedSettingName = Settings.V43_VERSION;
        } else if (event.affectsConfiguration(Settings.V43_BUILD)) {
          changedSettingName = Settings.V43_BUILD;
        } else if (event.affectsConfiguration(Settings.OSSTREAMS_BUILD)) {
          changedSettingName = Settings.OSSTREAMS_BUILD;
        }

        if (changedSettingName) {
          const oldValue =
            Configuration.getState(changedSettingName) === ''
              ? '""'
              : Configuration.getState(changedSettingName);
          const newValue =
            Configuration.getSetting(changedSettingName) === ''
              ? '""'
              : Configuration.getSetting(changedSettingName);
          const formatValue = (value: any): string =>
            typeof value === 'object'
              ? `\n${JSON.stringify(value, null, 4)}`
              : ` ${value}`;
          const whitespaceValue = typeof oldValue === 'object' ? '\n\n' : '\n';
          Registry.getDefaultMessageHandler().logInfo(
            `The ${changedSettingName} configuration setting was changed:\nPrevious value:${formatValue(
              oldValue
            )}${whitespaceValue}Current value: ${formatValue(newValue)}`
          );
          Configuration.setState(changedSettingName, newValue);
        }
      })
    );
  }

  /**
   * Get the value for a configuration setting
   * @param name the configuration setting name
   */
  public static getSetting(name: string): any {
    return workspace.getConfiguration().get(name);
  }

  /**
   * Set the value for a configuration setting
   * @param name the configuration setting name
   * @param value the new value
   * @param target the configuration target
   */
  public static setSetting(
    name: string,
    value: any,
    target = ConfigurationTarget.Global
  ): Thenable<any> {
    const configuration = workspace.getConfiguration();
    const inspect = this.inspectSetting(name);
    const {
      defaultValue,
      globalValue,
      workspaceValue,
      workspaceFolderValue
    } = inspect;

    if (workspaceFolderValue !== undefined) {
      if (value === workspaceFolderValue) {
        return Promise.resolve();
      }

      return configuration.update(
        name,
        value,
        ConfigurationTarget.WorkspaceFolder
      );
    }

    if (workspaceValue !== undefined) {
      if (value === workspaceValue) {
        return Promise.resolve();
      }

      return configuration.update(name, value, ConfigurationTarget.Workspace);
    }

    if (
      globalValue === value ||
      (globalValue === undefined && value === defaultValue)
    ) {
      return Promise.resolve();
    }

    return configuration.update(name, value, target);
  }

  /**
   * Inspect a configuration setting
   * @param name the configuration setting name
   */
  private static inspectSetting(name: string): any {
    return workspace.getConfiguration().inspect(name);
  }

  /**
   * Get the value for a key in the global state
   * @param key the key
   */
  public static getState(key: string): any {
    return this.getMemento().get(key);
  }

  /**
   * Set the value for a key in the global state
   * @param key the key
   * @param value the new value
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
