import _find from 'lodash/find';
import _map from 'lodash/map';
import _pick from 'lodash/pick';
import { commands, OutputChannel, window } from 'vscode';
import StreamsBuild from '.';
import { Streams, StreamsInstance } from '../streams';
import { Logger } from '../utils';

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
    private _info: { appRoot: string, filePath: string };

    /**
     * @param info    Information that identifies the build target
     */
    constructor(info: { appRoot: string, filePath: string }) {
        this._info = info;
    }

    /**
     * Handle an info message
     * @param message    The message to display
     * @param object     Information about the message
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
            return this._displayNotification(window.showInformationMessage, message, notificationButtons, isButtonSelectionRequired);
        }

        return Promise.resolve();
    }

    /**
     * Handle an warn message
     * @param message    The message to display
     * @param object     Information about the message
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
            return this._displayNotification(window.showWarningMessage, message, notificationButtons, isButtonSelectionRequired);
        }

        return Promise.resolve();
    }

    /**
     * Handle an error message
     * @param message    The message to display
     * @param object     Information about the message
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
        if (stack && stack.config && stack.status) {
            const stackObj: any = _pick(stack.config, ['method', 'url']);
            stackObj.status = stack.status;
            stackMessage = JSON.stringify(stackObj, null, 2);
        } else {
            stackMessage = Logger.getLoggableMessage(stack);
        }

        const detailMessageIncludesMessage = detailMessage && detailMessage !== '' && detailMessage.includes(message);
        const stackMessageIncludesMessage = stackMessage && stackMessage !== '' && stackMessage.includes(message);

        if (stackMessageIncludesMessage) {
            Logger.error(outputChannel, stackMessage, false, true);
        } else if (detailMessageIncludesMessage) {
            Logger.error(outputChannel, detailMessage, false, true);
        } else {
            Logger.error(outputChannel, this._sanitizeMessage(message));
        }
        if (detailMessage && detailMessage !== '' && !detailMessageIncludesMessage) {
            Logger.error(outputChannel, detailMessage, false, true);
        }
        if (stackMessage && stackMessage !== '' && !stackMessageIncludesMessage) {
            Logger.error(outputChannel, stackMessage, false, true);
        }

        // Handle notification
        if (message && showNotification) {
            return this._displayNotification(window.showErrorMessage, message, notificationButtons, isButtonSelectionRequired);
        }

        return Promise.resolve();
    }

    /**
     * Handle a success message
     * @param message    The message to display
     * @param object     Information about the message
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
            return this._displayNotification(window.showInformationMessage, message, notificationButtons, isButtonSelectionRequired);
        }

        return Promise.resolve();
    }

    /**
     * Handle the scenario where a default Streams instance has not been set
     */
    public handleDefaultInstanceNotSet(): Thenable<void> {
        return this.handleWarn('A default Streams instance has not been set.', {
            notificationButtons: [{
                label: 'Set Default',
                callbackFn: () => {
                    window.showQuickPick(Streams.getQuickPickItems(Streams.getInstances()), {
                        canPickMany: false,
                        ignoreFocusOut: true,
                        placeHolder: 'Select a Streams instance to set as the default'
                    }).then(async (item: any): Promise<void> => {
                        if (item) {
                            StreamsInstance.setDefaultInstance(item);
                        }
                    });
                }
            }]
        });
    }

    public promptForInput({
        password,
        placeHolder,
        prompt,
        value,
        valueSelection
    }: {
        password?: boolean,
        placeHolder?: string,
        prompt?: string,
        value?: string,
        valueSelection?: [number, number]
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

    /** Open the VS Code Settings */
    public async openSettingsPage(): Promise<void> {
        await commands.executeCommand('workbench.action.openSettings');
        await commands.executeCommand('settings.action.search');
    }

    /**
     * Log a message to an output channel
     * @param loggerFn    The logger function
     * @param message     The message to display
     * @param detail      The detail message
     */
    private _logToOutputChannel(loggerFn: Function, message: string, detail: string | string[]): void {
        const outputChannel = this._getOutputChannel();
        const detailMessage = Logger.getLoggableMessage(detail);
        let logMessage = message ? this._sanitizeMessage(message) : '';
        if (detailMessage) {
            logMessage += `\n${detailMessage}`;
        }
        if (logMessage !== '') {
            loggerFn(outputChannel, logMessage, false, true);
        }
    }

    /**
     * Display a notification
     * @param notificationFn               The show notification function
     * @param message                      The message to display
     * @param notificationButtons          The notification button objects
     * @param isButtonSelectionRequired    Whether or not button selection is required
     */
    private _displayNotification(notificationFn: Function, message: string, notificationButtons, isButtonSelectionRequired: boolean): Thenable<any> | Promise<any> {
        const buttons = this._processButtons(notificationButtons);
        const notificationPromise = notificationFn(this._sanitizeMessage(message), ...buttons)
            .then((selection: string) => this._handleNotificationButtonSelection(notificationButtons, selection));
        if (!isButtonSelectionRequired) {
            return Promise.resolve();
        }
        return buttons.length ? notificationPromise : Promise.resolve();
    }

    /**
     * Retrieve an output channel
     */
    private _getOutputChannel(): OutputChannel {
        if (!this._info) {
            return Logger.mainOutputChannel;
        }

        const { appRoot, filePath } = this._info;
        const channelObj = Logger.outputChannels[filePath];
        if (!channelObj) {
            const displayPath = StreamsBuild.getDisplayPath(appRoot, filePath);
            const outputChannel = Logger.registerOutputChannel(filePath, displayPath);
            outputChannel.show();
            return outputChannel;
        }
        return channelObj.outputChannel;
    }

    /**
     * Sanitize a message
     * @param message    The message to display
     */
    private _sanitizeMessage(message: string): string {
        return message.trim();
    }

    /**
     * Retrieve the button labels to display
     * @param buttons    The notification buttons to display
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
     * @param buttons      The notification buttons to display
     * @param selection    The label of the button that the user clicked on
     */
    private _handleNotificationButtonSelection(buttons: NotificationButton[], selection: string): Promise<void> {
        if (selection) {
            const buttonObj = _find(buttons, (obj: NotificationButton) => obj.label === selection);
            if (buttonObj && buttonObj.callbackFn) {
                return buttonObj.callbackFn();
            }
        }
        return Promise.resolve();
    }
}
