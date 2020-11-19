import _find from 'lodash/find';
import _map from 'lodash/map';
import _pick from 'lodash/pick';
import { commands, OutputChannel, window } from 'vscode';
import StreamsBuild from '.';
import { Streams, StreamsInstance } from '../streams';
import { Logger } from '../utils';

interface MessageHandlerProps {
  appRoot?: string;
  filePath?: string;
  bundleFilePath?: string;
  toolkitFolderPath?: string;
  primitiveOperatorFolderPath?: string;
}

interface Message {
  detail?: string | string[] | any;
  stack?: string | string[] | any;
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
  private _props: MessageHandlerProps;

  /**
   * @param info information that identifies the build target
   */
  constructor(props: MessageHandlerProps) {
    this._props = props;
  }

  /**
   * Handle an info message
   * @param message the message to display
   * @param object information about the message
   */
  public handleInfo(
    message: string,
    {
      detail = null,
      showNotification = true,
      notificationButtons = [],
      isButtonSelectionRequired = true
    }: Message = {}
  ): Thenable<void> {
    // Log to output channel
    this._logToOutputChannel(Logger.info, message, detail);

    // Handle notification
    if (message && showNotification) {
      return this._displayNotification(
        window.showInformationMessage,
        message,
        notificationButtons,
        isButtonSelectionRequired
      );
    }

    return Promise.resolve();
  }

  /**
   * Handle an warn message
   * @param message the message to display
   * @param object information about the message
   */
  public handleWarn(
    message: string,
    {
      detail = null,
      showNotification = true,
      notificationButtons = [],
      isButtonSelectionRequired = true
    }: Message = {}
  ): Thenable<void> {
    // Log to output channel
    this._logToOutputChannel(Logger.warn, message, detail);

    // Handle notification
    if (message && showNotification) {
      return this._displayNotification(
        window.showWarningMessage,
        message,
        notificationButtons,
        isButtonSelectionRequired
      );
    }

    return Promise.resolve();
  }

  /**
   * Handle an error message
   * @param message the message to display
   * @param object information about the message
   */
  public handleError(
    message: string,
    {
      detail = null,
      stack = null,
      showNotification = true,
      notificationButtons = [],
      isButtonSelectionRequired = true
    }: Message = {}
  ): Thenable<void> {
    // Log to output channel
    const outputChannel = this._getOutputChannel();
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
      detailMessage && detailMessage !== '' && detailMessage.includes(message);
    const stackMessageIncludesMessage =
      stackMessage && stackMessage !== '' && stackMessage.includes(message);

    if (stackMessageIncludesMessage) {
      Logger.error(outputChannel, stackMessage, false, false);
    } else if (detailMessageIncludesMessage) {
      Logger.error(outputChannel, detailMessage, false, false);
    } else {
      Logger.error(outputChannel, this._sanitizeMessage(message));
    }
    if (
      detailMessage &&
      detailMessage !== '' &&
      !detailMessageIncludesMessage
    ) {
      Logger.error(outputChannel, detailMessage, false, false);
    }
    if (stackMessage && stackMessage !== '' && !stackMessageIncludesMessage) {
      Logger.error(outputChannel, stackMessage, false, false);
    }

    // Handle notification
    if (message && showNotification) {
      return this._displayNotification(
        window.showErrorMessage,
        message,
        notificationButtons,
        isButtonSelectionRequired
      );
    }

    return Promise.resolve();
  }

  /**
   * Handle a success message
   * @param message the message to display
   * @param object information about the message
   */
  public handleSuccess(
    message: string,
    {
      detail = null,
      showNotification = true,
      notificationButtons = [],
      isButtonSelectionRequired = true
    }: Message = {}
  ): Thenable<void> {
    // Log to output channel
    this._logToOutputChannel(Logger.success, message, detail);

    // Handle notification
    if (message && showNotification) {
      return this._displayNotification(
        window.showInformationMessage,
        message,
        notificationButtons,
        isButtonSelectionRequired
      );
    }

    return Promise.resolve();
  }

  /**
   * Handle the scenario where a default Streams instance has not been set
   */
  public handleDefaultInstanceNotSet(): Thenable<void> {
    return this.handleWarn('A default Streams instance has not been set.', {
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
    const outputChannel = this._getOutputChannel();
    outputChannel.show(true);
  }

  /**
   * Log a message to an output channel
   * @param loggerFn the logger function
   * @param message the message to display
   * @param detail the detail message
   */
  private _logToOutputChannel(
    loggerFn: Function,
    message: string,
    detail: string | string[]
  ): void {
    const outputChannel = this._getOutputChannel();
    const detailMessage = Logger.getLoggableMessage(detail);
    let logMessage = message ? this._sanitizeMessage(message) : '';
    if (detailMessage) {
      logMessage += `\n${detailMessage}`;
    }
    if (logMessage !== '') {
      loggerFn(outputChannel, logMessage, false, false);
    }
  }

  /**
   * Display a notification
   * @param notificationFn the show notification function
   * @param message the message to display
   * @param notificationButtons the notification button objects
   * @param isButtonSelectionRequired whether or not button selection is required
   */
  private _displayNotification(
    notificationFn: Function,
    message: string,
    notificationButtons,
    isButtonSelectionRequired: boolean
  ): Thenable<any> | Promise<any> {
    const buttons = this._processButtons(notificationButtons);
    const notificationPromise = notificationFn(
      this._sanitizeMessage(message),
      ...buttons
    ).then((selection: string) =>
      this._handleNotificationButtonSelection(notificationButtons, selection)
    );
    if (!isButtonSelectionRequired) {
      return Promise.resolve();
    }
    return buttons.length ? notificationPromise : Promise.resolve();
  }

  /**
   * Retrieve an output channel
   */
  private _getOutputChannel(): OutputChannel {
    if (!this._props) {
      return Logger.mainOutputChannel;
    }

    const {
      appRoot,
      filePath,
      bundleFilePath,
      toolkitFolderPath,
      primitiveOperatorFolderPath
    } = this._props;
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
   * @param message the message to display
   */
  private _sanitizeMessage(message: string): string {
    return message.trim();
  }

  /**
   * Retrieve the button labels to display
   * @param buttons the notification buttons to display
   */
  private _processButtons(buttons: NotificationButton[]): string[] {
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
  private _handleNotificationButtonSelection(
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
