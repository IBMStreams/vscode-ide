import {
  CloudPakForDataAuthType,
  Editor,
  getStreamsInstance,
  IBM_CLOUD_DASHBOARD_URL,
  Instance,
  InstanceSelector,
  Registry,
  store,
  StreamsErrorType,
  StreamsInstanceType,
  ToolkitUtils
} from '@ibmstreams/common';
import _cloneDeep from 'lodash/cloneDeep';
import * as semver from 'semver';
import { window } from 'vscode';
import { Streams } from '.';
import { waitForLanguageClientReady } from '../languageClient';
import { Authentication, VSCode } from '../utils';
import { getStreamsExplorer } from '../views';

/**
 * Helper methods for Streams instances
 */
export default class StreamsInstance {
  /**
   * Add a Streams instance
   */
  public static addInstance(): void {
    Authentication.showAuthPanel(null, false, null);
  }

  /**
   * Remove Streams instances
   */
  public static removeInstances(): Thenable<string | void> {
    const storedInstances = Streams.getInstances();
    if (!storedInstances.length) {
      return window.showInformationMessage(
        'There are no Streams instances to remove.'
      );
    }

    return window
      .showQuickPick(Streams.getQuickPickItems(storedInstances), {
        canPickMany: true,
        ignoreFocusOut: true,
        placeHolder: 'Select the Streams instances to remove'
      })
      .then(async (items: any[]) => {
        if (items) {
          const defaultInstance = Streams.getDefaultInstance();
          const removeInstanceConnectionIds = items.map(
            (item: any) => item.instance.connectionId
          );

          // Update extension state
          let newStoredInstances = _cloneDeep(storedInstances);
          newStoredInstances = newStoredInstances.filter(
            (storedInstance: any) =>
              !removeInstanceConnectionIds.includes(storedInstance.connectionId)
          );
          await Streams.setInstances(newStoredInstances);

          // Update Redux state
          removeInstanceConnectionIds.forEach(async (connectionId: string) => {
            await store.dispatch(
              Instance.removeStreamsInstance(connectionId, true)
            );
            getStreamsExplorer()
              .getInstancesView()
              .unwatchStreamsInstance(connectionId);
          });

          // If removing the default instance, then prompt alert user
          if (
            defaultInstance &&
            removeInstanceConnectionIds.includes(defaultInstance.connectionId)
          ) {
            this._handleRemoveDefaultInstance(newStoredInstances);
          }

          getStreamsExplorer().refresh();
        }
      });
  }

  /**
   * Refresh Streams instances
   */
  public static async refreshInstances(): Promise<void> {
    try {
      const instances = InstanceSelector.selectInstances(store.getState());
      const authenticatedInstances = instances.filter((instance: any) =>
        Authentication.isAuthenticated(instance)
      );
      const promises = authenticatedInstances.map((storedInstance: any) =>
        store.dispatch(
          getStreamsInstance(storedInstance.connectionId, false, false)
        )
      );
      await Promise.all(promises);
      getStreamsExplorer().refresh();
    } catch (err) {
      Registry.getDefaultMessageHandler().handleError(
        'An error occurred while refreshing the Streams instances.',
        {
          detail: err.response || err.message || err,
          stack: err.response || err.stack
        }
      );
    }
  }

  /**
   * Authenticate to a Streams instance
   * @param instance the instance
   * @param useDefaultInstance whether or not to authenticate to the default instance
   * @param queuedActionId the queued action identifier
   */
  public static async authenticate(
    instance: any,
    useDefaultInstance: boolean,
    queuedActionId: string
  ): Promise<void> {
    if (!instance) {
      Authentication.showAuthPanel(
        instance,
        useDefaultInstance || false,
        queuedActionId || null
      );
      return;
    }

    const args = { instance, useDefaultInstance, queuedActionId };

    const existingInstance = instance.contextValue
      ? instance.instance
      : instance;
    const { connectionId } = existingInstance;

    // Abort if we're already authenticating
    const isAuthenticating = InstanceSelector.selectInstanceIsAuthenticating(
      store.getState(),
      connectionId
    );
    if (isAuthenticating) {
      // Wait for instance authentication to complete
      return this.waitForAuthenticated(instance, () => {
        if (queuedActionId) {
          store.dispatch(Editor.runQueuedAction(queuedActionId));
        }
      });
    }

    const instanceType = InstanceSelector.selectInstanceType(
      store.getState(),
      connectionId
    );
    const authentication = _cloneDeep(existingInstance.authentication);
    if (authentication) {
      // Only show authentication panel if we didn't save the user's password or this is a V4 instance
      if (
        (instanceType === StreamsInstanceType.V5_CPD &&
          authentication.authType &&
          ((authentication.authType === CloudPakForDataAuthType.Password &&
            authentication.rememberPassword) ||
            (authentication.authType === CloudPakForDataAuthType.ApiKey &&
              authentication.rememberApiKey))) ||
        (instanceType === StreamsInstanceType.V5_STANDALONE &&
          authentication.rememberPassword) ||
        instanceType === StreamsInstanceType.V4_STREAMING_ANALYTICS
      ) {
        // Automatically authenticate using saved values
        const instanceName = InstanceSelector.selectInstanceName(
          store.getState(),
          connectionId
        );
        const isDefault = InstanceSelector.selectInstanceIsDefault(
          store.getState(),
          connectionId
        );
        Registry.getDefaultMessageHandler().handleInfo(
          `Authenticating to the Streams instance ${instanceName}...`
        );
        if (
          instanceType === StreamsInstanceType.V5_CPD ||
          instanceType === StreamsInstanceType.V5_STANDALONE
        ) {
          // Get the saved password
          const serviceName = InstanceSelector.selectSystemKeychainServiceName(
            store.getState(),
            connectionId
          );
          const username = InstanceSelector.selectUsername(
            store.getState(),
            connectionId
          );
          if (serviceName && username) {
            const password = await Registry.getSystemKeychain().getCredentials(
              serviceName,
              username
            );
            if (!password) {
              const error = new Error(
                `Failed to retrieve the password associated with the username '${username}' and the service name '${serviceName}' from the system keychain.`
              );
              this._handleAuthenticationError(error, instanceName, args);
              return;
            }
            if (
              instanceType === StreamsInstanceType.V5_CPD &&
              authentication.authType
            ) {
              authentication.authType === CloudPakForDataAuthType.Password
                ? (authentication.password = password)
                : (authentication.apiKey = password);
            } else {
              authentication.password = password;
            }
          }
        }
        store
          .dispatch(
            Instance.addStreamsInstance(
              instanceType,
              authentication,
              isDefault,
              connectionId
            )
          )
          .then((result: any) => {
            // Result is a list of Cloud Pak for Data instances
            if (
              instanceType === StreamsInstanceType.V5_CPD &&
              result &&
              result.streamsInstances
            ) {
              const cpdVersion = InstanceSelector.selectCloudPakForDataVersion(
                store.getState(),
                connectionId,
                true
              );
              const getCpdInstanceName = (streamsInstance: any): string =>
                semver.gte(cpdVersion, '3.0.0')
                  ? streamsInstance.display_name
                  : streamsInstance.ServiceInstanceDisplayName;
              const currentInstance = result.streamsInstances.find(
                (streamsInstance: any) =>
                  getCpdInstanceName(streamsInstance) === instanceName
              );
              if (!currentInstance) {
                store.dispatch(
                  Instance.setInstanceIsAuthenticating(connectionId, false)
                );
                this._handleAuthenticationError(
                  new Error(
                    'The instance was not found. Verify that the instance exists.'
                  ),
                  instanceName,
                  args
                );
                return;
              }
              store
                .dispatch(
                  Instance.setCloudPakForDataStreamsInstance(
                    connectionId,
                    currentInstance,
                    connectionId
                  )
                )
                .then((cpdResult: any) =>
                  this._handleAuthenticationSuccess(
                    cpdResult,
                    connectionId,
                    instanceName,
                    queuedActionId
                  )
                )
                .catch((error: any) =>
                  this._handleAuthenticationError(error, instanceName, args)
                );
            } else {
              this._handleAuthenticationSuccess(
                result,
                connectionId,
                instanceName,
                queuedActionId
              );
            }
          })
          .catch((error: any) => {
            if (
              error.data &&
              error.data.type === StreamsErrorType.AUTHENTICATION_IN_PROGRESS
            ) {
              // Wait for instance authentication to complete
              this.waitForAuthenticated(instance, () => {
                if (queuedActionId) {
                  store.dispatch(Editor.runQueuedAction(queuedActionId));
                }
              });
            } else {
              this._handleAuthenticationError(error, instanceName, args);
            }
          });
      } else {
        Authentication.showAuthPanel(
          existingInstance,
          useDefaultInstance || false,
          queuedActionId || null
        );
      }
    }
  }

  /**
   * Set instance as default
   * @param instanceItem the instance tree item
   */
  public static async setDefaultInstance(instanceItem: any): Promise<void> {
    const { instance } = instanceItem;

    // Update extension state
    const storedInstances = Streams.getInstances();
    const newStoredInstances = _cloneDeep(storedInstances);
    const oldDefaultInstance = newStoredInstances.find(
      (storedInstance: any) => storedInstance.isDefault
    );
    if (oldDefaultInstance) {
      oldDefaultInstance.isDefault = false;
    }

    const newDefaultInstance = newStoredInstances.find(
      (storedInstance: any) =>
        storedInstance.connectionId === instance.connectionId
    );
    if (newDefaultInstance) {
      newDefaultInstance.isDefault = true;
    }

    await Streams.setInstances(newStoredInstances);

    // Update Redux state
    store.dispatch(
      Instance.updateDefaultStreamsInstance(
        oldDefaultInstance ? oldDefaultInstance.connectionId : null,
        newDefaultInstance ? newDefaultInstance.connectionId : null
      )
    );

    // Update StreamsExplorer tree
    Streams.setDefaultInstanceEnvContext();
    ToolkitUtils.clearToolkitCache();
    if (Authentication.isAuthenticated(newDefaultInstance)) {
      await ToolkitUtils.refreshToolkits(newDefaultInstance.connectionId);
    }
    getStreamsExplorer().refresh();
  }

  /**
   * Remove Streams instance
   * @param instanceItem the instance tree item
   */
  public static async removeInstance(instanceItem: any): Promise<void> {
    const {
      instance: { connectionId }
    } = instanceItem;
    const instanceName = InstanceSelector.selectInstanceName(
      store.getState(),
      connectionId
    );
    const label = `Are you sure you want to remove the Streams instance ${instanceName}?`;
    const callbackFn = async (): Promise<void> => {
      const defaultInstance = Streams.getDefaultInstance();

      // Update extension state
      let newStoredInstances = _cloneDeep(Streams.getInstances());
      newStoredInstances = newStoredInstances.filter(
        (storedInstance: any) => storedInstance.connectionId !== connectionId
      );
      await Streams.setInstances(newStoredInstances);

      // Update Redux state
      await store.dispatch(Instance.removeStreamsInstance(connectionId, true));
      getStreamsExplorer()
        .getInstancesView()
        .unwatchStreamsInstance(connectionId);

      // If removing the default instance, then prompt alert user
      if (defaultInstance && connectionId === defaultInstance.connectionId) {
        this._handleRemoveDefaultInstance(newStoredInstances);
      }

      getStreamsExplorer().refresh();
    };
    return VSCode.showConfirmationDialog(label, callbackFn);
  }

  /**
   * Refresh Streams instance
   * @param instanceItem the instance tree item
   */
  public static async refreshInstance(instanceItem: any): Promise<void> {
    const {
      instance: { connectionId }
    } = instanceItem;
    const instanceName = InstanceSelector.selectInstanceName(
      store.getState(),
      connectionId
    );
    try {
      Registry.getDefaultMessageHandler().handleInfo(
        `Refreshing the Streams instance ${instanceName}... This may take a while.`
      );
      await store.dispatch(getStreamsInstance(connectionId, false, false));
      getStreamsExplorer().refresh();
      Registry.getDefaultMessageHandler().handleSuccess(
        `Successfully refreshed the Streams instance ${instanceName}.`
      );
    } catch (err) {
      Registry.getDefaultMessageHandler().handleError(
        `An error occurred while refreshing the Streams instance ${instanceName}.`,
        {
          detail: err.response || err.message || err,
          stack: err.response || err.stack
        }
      );
    }
  }

  /**
   * Handle authentication success
   * @param newInstance the new Streams instance
   * @param connectionId the target Streams instance connection identifier
   * @param instanceName the target instance name
   * @param queuedActionId the queued action identifier
   */
  private static async _handleAuthenticationSuccess(
    newInstance: any,
    connectionId: string,
    instanceName: string,
    queuedActionId: string
  ): Promise<void> {
    Registry.getDefaultMessageHandler().handleInfo(
      `Successfully authenticated to the Streams instance ${instanceName}.`
    );
    getStreamsExplorer().getInstancesView().addInstance(newInstance);

    getStreamsExplorer().getInstancesView().watchStreamsInstance(connectionId);
    if (queuedActionId) {
      store.dispatch(Editor.runQueuedAction(queuedActionId));
    }

    const callbackFn = async (): Promise<void> => {
      await ToolkitUtils.refreshToolkits(connectionId);
      getStreamsExplorer().refreshToolkitsView();
    };
    waitForLanguageClientReady(callbackFn);
  }

  /**
   * Handle authentication success
   * @param error the authentication error
   * @param instanceName the target instance name
   * @param authArgs the original authentication arguments
   */
  private static _handleAuthenticationError(
    error: any,
    instanceName: string,
    authArgs: any
  ): void {
    if (
      error.data &&
      error.data.type ===
        StreamsErrorType.STREAMING_ANALYTICS_SERVICE_NOT_STARTED
    ) {
      const openCloudDashboardLabel = 'Open IBM Cloud Dashboard';
      const startServiceAndRetryLabel = 'Start Service and Retry';
      const callbackFn = (): void => {
        const { instance, useDefaultInstance, queuedActionId } = authArgs;
        this.authenticate(instance, useDefaultInstance, queuedActionId);
      };
      const notificationButtons = [
        {
          label: openCloudDashboardLabel,
          callbackFn: (): void => {
            Registry.getDefaultMessageHandler().handleInfo(
              `Selected: ${openCloudDashboardLabel}`,
              { showNotification: false }
            );
            return Registry.openUrl(IBM_CLOUD_DASHBOARD_URL);
          }
        },
        {
          label: startServiceAndRetryLabel,
          callbackFn: (): Promise<any> => {
            Registry.getDefaultMessageHandler().handleInfo(
              `Selected: ${startServiceAndRetryLabel}`,
              { showNotification: false }
            );
            return store.dispatch(
              Instance.startStreamingAnalyticsService(
                error.data.connectionId,
                callbackFn
              )
            );
          }
        }
      ];
      Registry.getDefaultMessageHandler().handleError(
        `Failed to authenticate to the Streams instance ${instanceName}. ${error.message}`,
        {
          notificationButtons,
          detail: error.response || error.message || error,
          stack: error.response || error.stack
        }
      );
    } else if (
      error.data &&
      error.data.type === StreamsErrorType.AUTHENTICATION_IN_PROGRESS
    ) {
      Registry.getDefaultMessageHandler().handleWarn(error.message);
    } else {
      Registry.getDefaultMessageHandler().handleError(
        `Failed to authenticate to the Streams instance ${instanceName}.`,
        {
          detail: error.response || error.message || error,
          stack: error.response || error.stack,
          notificationButtons: [
            {
              label: 'View Output',
              callbackFn: (): void => {
                Registry.getDefaultMessageHandler().showOutput();
              }
            }
          ],
          isButtonSelectionRequired: false
        }
      );
    }
  }

  /**
   * Handle removal of default instance
   * @param storedInstances the stored Streams instances
   */
  private static async _handleRemoveDefaultInstance(
    storedInstances: any[]
  ): Promise<void> {
    ToolkitUtils.clearToolkitCache();
    Streams.setDefaultInstanceEnvContext();

    if (storedInstances.length) {
      // Pick first instance by default
      await this.setDefaultInstance({ instance: storedInstances[0] });

      // Prompt user to pick a new default
      Registry.getDefaultMessageHandler().handleWarn(
        'The default Streams instance was removed. Set another instance as the default.',
        {
          notificationButtons: [
            {
              label: 'Set Default',
              callbackFn: (): void => {
                window
                  .showQuickPick(Streams.getQuickPickItems(storedInstances), {
                    canPickMany: false,
                    ignoreFocusOut: true,
                    placeHolder:
                      'Select a Streams instance to set as the default'
                  })
                  .then(
                    async (item: any): Promise<void> => {
                      if (item) {
                        this.setDefaultInstance(item);
                      }
                    }
                  );
              }
            }
          ]
        }
      );
    }
  }

  /**
   * Wait for an instance authentication to complete
   * @param instance the Streams instance
   * @param callbackFn the callback function to execute
   */
  private static waitForAuthenticated(
    instance: any,
    callbackFn: Function,
    currentWaitTime?: number
  ): void {
    // Abandon after two minutes of waiting
    if (currentWaitTime >= 120) {
      return;
    }
    if (!Authentication.isAuthenticated(instance)) {
      setTimeout(
        () =>
          this.waitForAuthenticated(
            instance,
            callbackFn,
            currentWaitTime ? currentWaitTime + 5 : 5
          ),
        5000
      );
    } else {
      callbackFn();
    }
  }
}
