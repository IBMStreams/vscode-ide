import { generateRandomId, LogLevel } from '@ibmstreams/common';
import _find from 'lodash/find';
import _map from 'lodash/map';
import _pick from 'lodash/pick';
import { commands, OutputChannel, window } from 'vscode';
import StreamsBuild from '.';
import { Streams, StreamsInstance } from '../streams';
import { Configuration, Logger, Settings } from '../utils';

interface MessageHandlerProps {
  appRoot?: string;
  filePath?: string;
  bundleFilePath?: string;
  toolkitFolderPath?: string;
  primitiveOperatorFolderPath?: string;
}

interface MessageProps {
  detail?: string | string[] | any;
  stack?: string | string[] | any;
  showOutputChannel?: boolean;
  showNotification?: boolean;
  notificationButtons?: NotificationButton[];
  isButtonSelectionRequired?: boolean;
}

interface NotificationButton {
  label: string;
  callbackFn: () => any;
}

/**
 * Handles build and submission messages
 */
export default class MessageHandler {
  private id: string;

  /**
   * @param info information that identifies the build target
   */
  constructor(private props: MessageHandlerProps) {
    this.id = generateRandomId('messageHandler');
  }

  /**
   * Log a message at the error level
   * @param message the message to log
   * @param messageProps the message properties
   */
  public logError(
    message: string,
    messageProps: MessageProps = {}
  ): Promise<void> {
    const logLevel = Configuration.getSetting(Settings.LOG_LEVEL);
    const validLogLevels = [
      LogLevel.Error,
      LogLevel.Warn,
      LogLevel.Info,
      LogLevel.Trace
    ];
    if (validLogLevels.includes(logLevel)) {
      const { detail, stack, showOutputChannel } = messageProps;

      const detailMessage = Streams.getErrorMessage(detail);
      let stackMessage: string;
      // CDIS is the unique component prefix that identifies IBM Streams log messages
      // If an error message contains such a log message, do not show the stack trace
      if (message.includes('CDIS')) {
        stackMessage = null;
      } else if (stack && stack.config && stack.status) {
        const stackObj: any = _pick(stack.config, ['method', 'url']);
        stackObj.status = stack.status;
        stackMessage = JSON.stringify(stackObj, null, 2);
      } else {
        stackMessage = Logger.getLoggableMessage(stack);
      }

      const detailMessageIncludesMessage =
        detailMessage &&
        detailMessage !== '' &&
        detailMessage.includes(message);
      const stackMessageIncludesMessage =
        stackMessage && stackMessage !== '' && stackMessage.includes(message);

      let messageToDisplay = null;
      if (stackMessageIncludesMessage) {
        messageToDisplay = stackMessage;
      } else if (detailMessageIncludesMessage) {
        messageToDisplay = detailMessage;
      } else {
        messageToDisplay = this.sanitizeMessage(message);
      }
      if (messageToDisplay) {
        this.logToOutputChannel(
          LogLevel.Error,
          messageToDisplay,
          null,
          showOutputChannel
        );
      }

      messageToDisplay = null;
      if (
        detailMessage &&
        detailMessage !== '' &&
        !detailMessageIncludesMessage
      ) {
        messageToDisplay = detailMessage;
      }
      if (stackMessage && stackMessage !== '' && !stackMessageIncludesMessage) {
        messageToDisplay = stackMessage;
      }
      if (messageToDisplay) {
        this.logToOutputChannel(
          LogLevel.Error,
          messageToDisplay,
          null,
          showOutputChannel
        );
      }

      return this.handleNotification(
        window.showErrorMessage,
        message,
        messageProps
      );
    }

    return Promise.resolve();
  }

  /**
   * Log a message at the warn level
   * @param message the message to log
   * @param messageProps the message properties
   */
  public logWarn(
    message: string,
    messageProps: MessageProps = {}
  ): Promise<void> {
    const logLevel = Configuration.getSetting(Settings.LOG_LEVEL);
    const validLogLevels = [LogLevel.Warn, LogLevel.Info, LogLevel.Trace];
    if (validLogLevels.includes(logLevel)) {
      this.logToOutputChannel(
        LogLevel.Warn,
        message,
        messageProps.detail,
        messageProps.showOutputChannel
      );
      return this.handleNotification(
        window.showWarningMessage,
        message,
        messageProps
      );
    }
    return Promise.resolve();
  }

  /**
   * Log a message at the info level
   * @param message the message to log
   * @param messageProps the message properties
   */
  public logInfo(
    message: string,
    messageProps: MessageProps = {}
  ): Promise<void> {
    const logLevel = Configuration.getSetting(Settings.LOG_LEVEL);
    const validLogLevels = [LogLevel.Info, LogLevel.Trace];
    if (validLogLevels.includes(logLevel)) {
      this.logToOutputChannel(
        LogLevel.Info,
        message,
        messageProps.detail,
        messageProps.showOutputChannel
      );
      return this.handleNotification(
        window.showInformationMessage,
        message,
        messageProps
      );
    }
    return Promise.resolve();
  }

  /**
   * Log a message at the trace level
   * @param message the message to log
   * @param messageProps the message properties
   */
  public logTrace(
    message: string,
    messageProps: MessageProps = {}
  ): Promise<void> {
    const logLevel = Configuration.getSetting(Settings.LOG_LEVEL);
    const validLogLevels = [LogLevel.Trace];
    if (validLogLevels.includes(logLevel)) {
      this.logToOutputChannel(
        LogLevel.Trace,
        message,
        messageProps.detail,
        messageProps.showOutputChannel
      );
      return this.handleNotification(
        window.showInformationMessage,
        message,
        messageProps
      );
    }
    return Promise.resolve();
  }

  /**
   * Handle the scenario where a default Streams instance has not been set
   */
  public handleDefaultInstanceNotSet(): Promise<void> {
    return this.logWarn('A default Streams instance has not been set.', {
      notificationButtons: [
        {
          label: 'Set Default',
          callbackFn: (): void => {
            window
              .showQuickPick(
                Streams.getQuickPickItems(Streams.getInstances()),
                {
                  canPickMany: false,
                  ignoreFocusOut: true,
                  placeHolder: 'Select a Streams instance to set as the default'
                }
              )
              .then(
                async (item: any): Promise<void> => {
                  if (item) {
                    StreamsInstance.setDefaultInstance(item);
                  }
                }
              );
          }
        }
      ]
    });
  }

  /**
   * Prompt user for input
   * @param
   */
  public promptForInput({
    password,
    placeHolder,
    prompt,
    value,
    valueSelection
  }: {
    password?: boolean;
    placeHolder?: string;
    prompt?: string;
    value?: string;
    valueSelection?: [number, number];
  }): Thenable<string> {
    return window.showInputBox({
      ignoreFocusOut: true,
      password,
      placeHolder,
      prompt,
      value,
      valueSelection
    });
  }

  /**
   * Prompt user for selection
   * @param items the selection items
   * @param placeHolder the placeholder text
   * @param options the selection options
   */
  public promptForSelection(
    items: string[],
    placeHolder: string,
    options?: any
  ): Thenable<any> {
    const quickPickOptions = {
      ignoreFocusOut: true,
      matchOnDescription: true,
      placeHolder,
      ...options
    };
    return window.showQuickPick(items, quickPickOptions);
  }

  /** Open the VS Code Settings */
  public async openSettingsPage(): Promise<void> {
    await commands.executeCommand('workbench.action.openSettings');
    await commands.executeCommand('settings.action.search');
  }

  /**
   * Show the output channel
   */
  public showOutput(): void {
    const outputChannel = this.getOutputChannel();
    outputChannel.show(true);
  }

  /**
   * Log a message to an output channel
   * @param logLevel the log level
   * @param message the message to log
   * @param detail the detail message
   * @param showOutputChannel whether to switch focus to the output channel
   */
  private logToOutputChannel(
    logLevel: LogLevel,
    message: string,
    detail: string | string[],
    showOutputChannel = false
  ): void {
    const outputChannel = this.getOutputChannel();
    const detailMessage = Logger.getLoggableMessage(detail);
    let logMessage = message ? this.sanitizeMessage(message) : '';
    if (detailMessage) {
      logMessage += `\n${detailMessage}`;
    }
    if (logMessage !== '') {
      Logger.log(logLevel, outputChannel, logMessage, showOutputChannel, false);
    }
  }

  /**
   * Handle notification
   * @param notificationFn the show notification function
   * @param message the message to display
   * @param messageProps the message properties
   */
  private handleNotification(
    notificationFn: Function,
    message: string,
    messageProps: MessageProps = {}
  ): Promise<void> {
    const {
      showNotification,
      notificationButtons,
      isButtonSelectionRequired
    } = messageProps;
    if (showNotification) {
      const buttons = this.processButtons(notificationButtons);
      const notificationPromise = notificationFn(
        this.sanitizeMessage(message),
        ...buttons
      ).then((selection: string) =>
        this.handleNotificationButtonSelection(notificationButtons, selection)
      );
      if (!isButtonSelectionRequired) {
        return Promise.resolve();
      }
      return buttons.length ? notificationPromise : Promise.resolve();
    }

    return Promise.resolve();
  }

  /**
   * Retrieve an output channel
   */
  private getOutputChannel(): OutputChannel {
    if (!this.props) {
      return Logger.mainOutputChannel;
    }

    const {
      appRoot,
      filePath,
      bundleFilePath,
      toolkitFolderPath,
      primitiveOperatorFolderPath
    } = this.props;
    let channelObj;
    if (appRoot && filePath) {
      channelObj = Logger.outputChannels[filePath];
      if (!channelObj) {
        const displayPath = StreamsBuild.getDisplayPath(
          appRoot,
          filePath,
          null,
          null
        );
        const outputChannel = Logger.registerOutputChannel(
          filePath,
          displayPath
        );
        return outputChannel;
      }
      return channelObj.outputChannel;
    } else if (bundleFilePath) {
      channelObj = Logger.outputChannels[bundleFilePath];
      if (!channelObj) {
        const displayPath = StreamsBuild.getDisplayPath(
          null,
          null,
          bundleFilePath,
          null
        );
        const outputChannel = Logger.registerOutputChannel(
          bundleFilePath,
          displayPath
        );
        return outputChannel;
      }
    } else if (toolkitFolderPath) {
      channelObj = Logger.outputChannels[toolkitFolderPath];
      if (!channelObj) {
        const displayPath = StreamsBuild.getDisplayPath(
          null,
          null,
          null,
          toolkitFolderPath
        );
        const outputChannel = Logger.registerOutputChannel(
          toolkitFolderPath,
          displayPath
        );
        return outputChannel;
      }
    } else if (primitiveOperatorFolderPath) {
      channelObj = Logger.outputChannels[primitiveOperatorFolderPath];
      if (!channelObj) {
        const displayPath = StreamsBuild.getDisplayPath(
          null,
          null,
          null,
          primitiveOperatorFolderPath
        );
        const outputChannel = Logger.registerOutputChannel(
          primitiveOperatorFolderPath,
          displayPath
        );
        return outputChannel;
      }
    }
    return channelObj.outputChannel;
  }

  /**
   * Sanitize a message
   * @param message the message to log
   */
  private sanitizeMessage(message: string): string {
    return message.trim();
  }

  /**
   * Retrieve the button labels to display
   * @param buttons the notification buttons to display
   */
  private processButtons(buttons: NotificationButton[]): string[] {
    let labels = [];
    if (Array.isArray(buttons)) {
      labels = _map(buttons, (obj: NotificationButton) => obj.label);
    }
    return labels;
  }

  /**
   * Handle a notification button selection
   * @param buttons the notification buttons to display
   * @param selection the label of the button that the user clicked on
   */
  private handleNotificationButtonSelection(
    buttons: NotificationButton[],
    selection: string
  ): Promise<void> {
    if (selection) {
      const buttonObj = _find(
        buttons,
        (obj: NotificationButton) => obj.label === selection
      );
      if (buttonObj && buttonObj.callbackFn) {
        return buttonObj.callbackFn();
      }
    }
    return Promise.resolve();
  }
}
