import { InstanceSelector, store } from '@ibmstreams/common';
import { commands } from 'vscode';
import { Commands } from '../commands';
import { Streams } from '../streams';

/**
 * Manages Streams authentication
 */
export default class Authentication {
    /**
     * Check if authenticated to the Streams instance
     */
    public static isAuthenticated(instance: any): boolean {
        const authInstance = instance || Streams.getDefaultInstance();
        if (!authInstance) {
            return false;
        }
        const instanceInReduxState = InstanceSelector.selectInstance(store.getState(), authInstance.connectionId);
        if (!instanceInReduxState) {
            return false;
        }
        return !!instanceInReduxState.streamsInstance;
    }

    /**
     * Show authentication webview panel if not yet authenticated to the Streams instance
     * @param existingInstance      The existing instance details
     * @param useDefaultInstance    Whether or not to authenticate to the default instance
     * @param queuedActionId        The queued action identifier
     */
    public static showAuthPanel(existingInstance: any, useDefaultInstance: boolean, queuedActionId: string): void {
        if (useDefaultInstance && !existingInstance) {
            existingInstance = Streams.getDefaultInstance();
        }

        commands.executeCommand(Commands.ENVIRONMENT.SHOW_AUTHENTICATION_WEBVIEW_PANEL, existingInstance, queuedActionId);
    }

    /**
     * Get the Streams properties
     * @param instance    the Streams instance
     */
    public static getProperties(instance: any): any {
        const state = store.getState();
        const { connectionId } = instance;
        return {
            instance: InstanceSelector.selectInstance(state, connectionId),
            instanceName: InstanceSelector.selectInstanceName(state, connectionId),
            instanceType: InstanceSelector.selectInstanceType(state, connectionId),
            instanceRestUrl: InstanceSelector.selectRootInstanceRestUrl(state, connectionId)
        };
    }
}
