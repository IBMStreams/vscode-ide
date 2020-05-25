import {
    CloudPakForDataVersion, Instance, InstanceSelector, Registry, store, StreamsInstanceType
} from '@streams/common';
import _invert from 'lodash/invert';
import { ExtensionContext, QuickPickItem, window, WindowState } from 'vscode';
import {
    CommandContexts, Configuration, Logger, setContext, State
} from '../utils';
import { getStreamsExplorer } from '../views';

export { default as StreamsInstance } from './instance';

/**
 * Maps Streams environment keys to names
 */
export const STREAMS_ENV = {
    [StreamsInstanceType.V5_CPD]: 'IBM Cloud Pak for Data deployment',
    [StreamsInstanceType.V5_STANDALONE]: 'IBM Streams standalone deployment',
    [StreamsInstanceType.V4_STREAMING_ANALYTICS]: 'IBM Streaming Analytics on IBM Cloud'
}

/**
 * Maps Cloud Pak for Data version keys to names
 */
export const CPD_VERSION = {
    [CloudPakForDataVersion.V3_0]: 'Version 3.0',
    [CloudPakForDataVersion.V2_5]: 'Version 2.5',
    [CloudPakForDataVersion.V2_1]: 'Version 2.1'
}

/**
 * Utility methods related to Streams
 */
export class Streams {
    /**
     * Initialize Streams utilities
     * @param context    The extension context
     */
    public static initialize(context: ExtensionContext): void {
        context.subscriptions.push(window.onDidChangeWindowState(async (windowState: WindowState) => {
            if (windowState && windowState.focused) {
                // Refresh the Streams Explorer view based on the extension global state
                getStreamsExplorer().refresh();

                // Update the Redux state with the current set of instances
                const storedInstances = Streams.getInstances();
                const reduxInstances = InstanceSelector.selectInstances(store.getState());
                // Handle added instances
                const addedInstances = storedInstances.filter((storedInstance: any) => {
                    const doesNotInclude = !reduxInstances.some((reduxInstance: any) => {
                        const isSameInstance = storedInstance.connectionId === reduxInstance.connectionId;
                        return isSameInstance;
                    });
                    return doesNotInclude;
                });
                await Promise.all(addedInstances.map(async (addedInstance: any) => {
                    await store.dispatch(Instance.addStreamsInstanceWithoutAuthentication(addedInstance))
                        .catch((error: any) => {
                            Registry.getDefaultMessageHandler().handleError(
                                'An error occurred while adding Streams instances to the Redux state.',
                                { showNotification: false, detail: error }
                            );
                        });
                }));
                // Handle removed instances
                const removedInstances = reduxInstances.filter((reduxInstance: any) => {
                    const doesNotInclude = !storedInstances.some((storedInstance: any) => {
                        const isSameInstance = reduxInstance.connectionId === storedInstance.connectionId;
                        return isSameInstance;
                    });
                    return doesNotInclude;
                });
                await Promise.all(removedInstances.map(async (removedInstance: any) => {
                    await store.dispatch(Instance.removeStreamsInstance(removedInstance.connectionId, true));
                    getStreamsExplorer().getInstancesView().unwatchStreamsInstance(removedInstance.connectionId);
                }));
            }
        }));
    }

    /**
     * Set the default instance environment context (used for `when` clause context in `package.json`)
     */
    public static async setDefaultInstanceEnvContext(): Promise<void> {
        // Set the default instance environment context
        await setContext(CommandContexts.DefaultInstanceEnv, this.getDefaultInstanceEnv());

        // Set the console enabled context
        const defaultInstance = this.getDefaultInstance();
        const consoleEnabled = defaultInstance
            ? InstanceSelector.selectConsoleEnabled(store.getState(), defaultInstance.connectionId)
            : null;
        await setContext(CommandContexts.ConsoleEnabled, consoleEnabled);
    }

    /**
     * Convert an environment key into a name
     * @param key    The Streams environment key
     */
    public static getEnvNameFromKey(key: string): string {
        return STREAMS_ENV[key] || null;
    }

    /**
     * Convert an environment name into a key
     * @param name    The Streams environment name
     */
    public static getEnvKeyFromName(name: string): string {
        return (_invert(STREAMS_ENV))[name] || null;
    }

    /**
     * Get the instances
     */
    public static getInstances(): any[] {
        return Configuration.getState(State.STREAMS_INSTANCES) || [];
    }

    /**
     * Set the instances
     * @param instances    The instances
     */
    public static setInstances(instances: any[]): Thenable<void> {
        return Configuration.setState(State.STREAMS_INSTANCES, instances);
    }

    /**
     * Get the default instance used for builds, grammar, toolkits, etc.
     */
    public static getDefaultInstance(): any {
        const instances = this.getInstances();
        return instances.find((instance: any) => instance.isDefault) || null;
    }

    /**
     * Get the default instance environment
     */
    public static getDefaultInstanceEnv(): string {
        const defaultInstance = this.getDefaultInstance();
        return defaultInstance ? defaultInstance.instanceType : null;
    }

    /**
     * Check if there is a default instance environment set
     */
    public static checkDefaultInstanceEnv(): any {
        const defaultInstanceEnv = this.getDefaultInstanceEnv();
        if (!defaultInstanceEnv && this.getInstances().length) {
            Registry.getDefaultMessageHandler().handleDefaultInstanceNotSet();
            return false;
        }
        return defaultInstanceEnv;
    }

    /**
     * Check if there is a default instance set
     */
    public static checkDefaultInstance(): any {
        const defaultInstance = this.getDefaultInstance();
        if (!defaultInstance && this.getInstances().length) {
            Registry.getDefaultMessageHandler().handleDefaultInstanceNotSet();
            return false;
        }
        return defaultInstance;
    }

    /**
     * Convert instance objects to quick pick items
     * @param instances    The Streams instance objects
     */
    public static getQuickPickItems(instances: any): QuickPickItem[] {
        const items = instances.map((instance: any) => {
            const { connectionId } = instance;
            const instanceType = InstanceSelector.selectInstanceType(store.getState(), connectionId);
            const instanceName = InstanceSelector.selectInstanceName(store.getState(), connectionId);
            const isDefault = InstanceSelector.selectInstanceIsDefault(store.getState(), connectionId);

            let detail: string;
            switch (instanceType) {
                case StreamsInstanceType.V5_CPD:
                    detail = InstanceSelector.selectCloudPakForDataUrl(store.getState(), connectionId);
                    break;
                case StreamsInstanceType.V5_STANDALONE:
                    detail = InstanceSelector.selectStandaloneRestServiceUrl(store.getState(), connectionId);
                    break;
                case StreamsInstanceType.V4_STREAMING_ANALYTICS:
                    detail = InstanceSelector.selectStreamingAnalyticsV2RestUrl(store.getState(), connectionId);
                    break;
                default:
                    break;
            }
            const item = {
                label: `${instanceName}${isDefault ? ' (Default)' : ''}`,
                description: this.getVersionLabel(connectionId) || null,
                detail,
                instance
            };
            return item;
        });
        return items;
    }

    /**
     * Get the version label for an instance
     * @param connectionId    The target Streams instance connection identifier
     */
    public static getVersionLabel(connectionId: string): string {
        const instanceType = InstanceSelector.selectInstanceType(store.getState(), connectionId);

        // Get instance version
        let streamsVersion = InstanceSelector.selectStreamsVersion(store.getState(), connectionId);
        streamsVersion = this._getTruncatedVersion(streamsVersion);
        let cpdVersion = null;
        if (instanceType === StreamsInstanceType.V5_CPD) {
            const version = InstanceSelector.selectCloudPakForDataVersion(store.getState(), connectionId);
            if (version) {
                cpdVersion = this._getTruncatedVersion(version.substr(1));
            }
        }

        // Build label
        let label = this.getEnvNameFromKey(instanceType);
        switch (instanceType) {
            case StreamsInstanceType.V5_CPD:
                if (streamsVersion) {
                    label = label.replace('Streams', `Streams V${streamsVersion}`);
                }
                if (cpdVersion) {
                    label = `${label}${cpdVersion ? ` V${cpdVersion}` : ''}`;
                }
                break;
            case StreamsInstanceType.V5_STANDALONE:
                if (streamsVersion) {
                    label = `${label} V${streamsVersion}`;
                }
                break;
            case StreamsInstanceType.V4_STREAMING_ANALYTICS:
                if (streamsVersion) {
                    label = label.replace('Streaming Analytics', `Streaming Analytics V${streamsVersion}`);
                }
                break;
            default:
                break;
        }
        if (label) {
            label = label.replace(/IBM\s/g, '');
        }
        return label;
    }

    /**
     * Convert a Streams error object to an error message
     * @param error    The error object
     */
    public static getErrorMessage(error: any): string {
        let message = Logger.getLoggableMessage(error);
        if (error) {
            const { data } = error;
            if (data) {
                if (typeof data === 'string') {
                    message = Logger.getLoggableMessage(data);
                } else {
                    const {
                        exception, messages, errors, errorCode, errorMessage
                    } = data;
                    if (typeof exception === 'string') {
                        message = Logger.getLoggableMessage(exception);
                    } else if (Array.isArray(messages)) {
                        message = Logger.getLoggableMessage(messages.map((msgObj: any) => msgObj.message));
                    } else if (Array.isArray(errors)) {
                        message = Logger.getLoggableMessage(errors.map((msgObj: any) => msgObj.message));
                    } else if (typeof errorCode === 'string' && typeof errorMessage === 'string') {
                        message = Logger.getLoggableMessage(`${errorCode} ${errorMessage}`);
                    }
                }
            }
        }
        if (typeof message !== 'string') {
            message = '';
        } else if (!message.endsWith('.')) {
            message += '.';
        }
        return message;
    }

    /**
     * Get a truncated version number
     * @param version    The version number
     */
    private static _getTruncatedVersion(version: string): string {
        return version ? version.split('.').slice(0, 2).join('.') : null;
    }
}
