import {
  IBM_CLOUD_DASHBOARD_URL,
  InstanceSelector,
  Registry,
  store,
  StreamsInstanceType
} from '@ibmstreams/common';
import { env, Uri } from 'vscode';
import { Commands, BaseCommand } from '.';
import { Streams } from '../streams';
import { Logger } from '../utils';

/**
 * Command that opens a link in a web browser
 */
export default class OpenLinkCommand implements BaseCommand {
  /**
   * Initialize the command
   * @param commandName the name of the command
   */
  constructor(public commandName: string) {}

  /**
   * Execute the command
   */
  public execute(): void {
    const defaultInstance = Streams.checkDefaultInstance();
    if (!defaultInstance) {
      return;
    }
    switch (this.commandName) {
      case Commands.ENVIRONMENT.CPD_OPEN_CONSOLE:
        this._openStreamsCpdConsole(defaultInstance);
        break;
      case Commands.ENVIRONMENT.CPD_OPEN_DASHBOARD:
        this._openCpdDashboard(defaultInstance);
        break;
      case Commands.ENVIRONMENT.STREAMS_STANDALONE_OPEN_CONSOLE:
        this._openStreamsStandaloneConsole(defaultInstance);
        break;
      case Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_CONSOLE:
        this._openStreamingAnalyticsConsole(defaultInstance);
        break;
      case Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_DASHBOARD:
        this._openCloudDashboard();
        break;
      default:
        break;
    }
  }

  /**
   * Open a URL in a browser
   * @param url the URL to open
   * @param callback the callback function
   */
  private _openUrl(url: string, callback?: () => void): Thenable<void> {
    return env.openExternal(Uri.parse(url)).then(() => callback && callback());
  }

  /**
   * Open IBM Streams Console
   * @param defaultInstance the default instance
   * @param name the Streams name
   */
  private _openStreamsConsole(defaultInstance: any, name: string): void {
    try {
      const consoleUrl = InstanceSelector.selectConsoleUrl(
        store.getState(),
        defaultInstance.connectionId
      );
      this._openUrl(consoleUrl, () =>
        Registry.getDefaultMessageHandler().logInfo(
          `Opened IBM ${name} Console: ${consoleUrl}`
        )
      );
    } catch (error) {
      Registry.getDefaultMessageHandler().logError(
        `Error opening IBM ${name} Console.`,
        { showNotification: true }
      );
      if (error.stack) {
        Registry.getDefaultMessageHandler().logError(error.stack);
      }
    }
  }

  /**
   * Open IBM Streams Console for Cloud Pak for Data deployments
   * @param defaultInstance the default instance
   */
  private _openStreamsCpdConsole(defaultInstance: any): void {
    if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V5_CPD) {
      this._openStreamsConsole(defaultInstance, 'Streams');
    }
  }

  /**
   * Open IBM Cloud Pak for Data Dashboard
   * @param defaultInstance the default instance
   */
  private _openCpdDashboard(defaultInstance: any): void {
    if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V5_CPD) {
      try {
        const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
          store.getState(),
          defaultInstance.connectionId
        );
        const cpdDashboardUrl = `${cpdUrl}/zen/#/homepage`;
        this._openUrl(cpdDashboardUrl, () =>
          Registry.getDefaultMessageHandler().logInfo(
            `Opened IBM Cloud Pak for Data Dashboard: ${cpdDashboardUrl}`
          )
        );
      } catch (error) {
        Registry.getDefaultMessageHandler().logError(
          'Error opening IBM Cloud Pak for Data Dashboard.',
          { showNotification: true }
        );
        if (error.stack) {
          Registry.getDefaultMessageHandler().logError(error.stack);
        }
      }
    }
  }

  /**
   * Open IBM Streams Console for Streams Standalone deployments
   * @param defaultInstance the default instance
   */
  private _openStreamsStandaloneConsole(defaultInstance: any): void {
    if (Streams.getDefaultInstanceEnv() === StreamsInstanceType.V5_STANDALONE) {
      this._openStreamsConsole(defaultInstance, 'Streams');
    }
  }

  /**
   * Open IBM Streaming Analytics Console
   * @param defaultInstance the default instance
   */
  private _openStreamingAnalyticsConsole(defaultInstance: any): void {
    if (
      Streams.getDefaultInstanceEnv() ===
      StreamsInstanceType.V4_STREAMING_ANALYTICS
    ) {
      this._openStreamsConsole(defaultInstance, 'Streaming Analytics');
    }
  }

  /**
   * Open IBM Cloud Dashboard
   */
  private _openCloudDashboard(): void {
    if (
      Streams.getDefaultInstanceEnv() ===
      StreamsInstanceType.V4_STREAMING_ANALYTICS
    ) {
      try {
        this._openUrl(IBM_CLOUD_DASHBOARD_URL, () =>
          Registry.getDefaultMessageHandler().logInfo(
            `Opened IBM Cloud Dashboard: ${IBM_CLOUD_DASHBOARD_URL}`
          )
        );
      } catch (error) {
        Registry.getDefaultMessageHandler().logError(
          'Error opening IBM Cloud Dashboard.',
          { showNotification: true }
        );
        if (error.stack) {
          Registry.getDefaultMessageHandler().logError(error.stack);
        }
      }
    }
  }
}
