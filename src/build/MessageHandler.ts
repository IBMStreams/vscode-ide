import * as _ from 'lodash';
import * as path from 'path';
import { commands, OutputChannel, window } from 'vscode';
import { Commands } from '../commands';
import { Logger } from '../utils';

interface NotificationButton {
    label: string;
    callbackFn: () => any;
}

/**
 * Handles build and submission messages
 */
export default class MessageHandler {
    private _info: { appRoot: string, filePath: string };
    private _timestampRegex: RegExp;

    /**
     * @param info    Information that identifies the build target
     */
    constructor(info: { appRoot: string, filePath: string }) {
        this._info = info;
        this._timestampRegex = /^[0-9][\w-:.]+\s/;
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
            description = null,
            showNotification = true,
            showConsoleMessage = true,
            notificationAutoDismiss = true,
            notificationButtons = []
        }: {
            detail?: string | string[],
            description?: string,
            showNotification?: boolean,
            showConsoleMessage?: boolean,
            notificationAutoDismiss?: true,
            notificationButtons?: NotificationButton[]
        } = {}
    ): Thenable<void> {
        if (showConsoleMessage) {
            const outputChannel = this._getOutputChannel();
            const detailMessage = this.joinMessageArray(detail);
            const logMessage = `${message}${detailMessage ? `\n${detailMessage}` : ''}`;
            if (logMessage !== '') {
                Logger.info(outputChannel, logMessage, false, true);
            }
        }

        if (showNotification && typeof message === 'string') {
            const buttons = this._processButtons(notificationButtons);
            return window.showInformationMessage(message, ...buttons).then((selection: string) => {
                this._handleNotificationButtonSelection(notificationButtons, selection);
            });
        }

        return null;
    }

    /**
     * Handle an error message
     * @param message    The message to display
     * @param object     Information about the message
     */
    public handleError(
        message: string,
        {
            detail,
            description,
            stack,
            showNotification = true,
            showConsoleMessage = true,
            consoleErrorLog = true,
            notificationAutoDismiss = false,
            notificationButtons = []
        }: {
            detail?: string | string[],
            description?: string,
            stack?: string[],
            showNotification?: boolean,
            showConsoleMessage?: boolean,
            consoleErrorLog?: boolean,
            notificationAutoDismiss?: boolean,
            notificationButtons?: NotificationButton[]
        } = {}
    ): Thenable<void> {
        if (showConsoleMessage) {
            const outputChannel = this._getOutputChannel();
            const detailMessage = this.joinMessageArray(detail);
            const stackMessage = this.joinMessageArray(stack);
            Logger.error(outputChannel, message);
            if (typeof detailMessage === 'string' && detailMessage.length) {
                Logger.error(outputChannel, detailMessage);
            }
            if (typeof stackMessage === 'string' && stackMessage.length) {
                Logger.error(outputChannel, stackMessage);
            }
        }

        if (showNotification && typeof message === 'string') {
            const buttons = this._processButtons(notificationButtons);
            return window.showErrorMessage(message, ...buttons).then((selection: string) => {
                this._handleNotificationButtonSelection(notificationButtons, selection);
            });
        }

        return null;
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
            description = null,
            showNotification = true,
            showConsoleMessage = true,
            notificationAutoDismiss = false,
            notificationButtons = []
        }: {
            detail?: string | string[],
            description?: string,
            showNotification?: boolean,
            showConsoleMessage?: boolean,
            notificationAutoDismiss?: boolean,
            notificationButtons?: NotificationButton[]
        } = {}
    ): Thenable<void> {
        if (showConsoleMessage) {
            const outputChannel = this._getOutputChannel();
            const detailMessage = this.joinMessageArray(detail);
            const logMessage = `${message}${detailMessage ? `\n${detailMessage}` : ''}`;
            Logger.success(outputChannel, logMessage);
        }

        if (showNotification && typeof message === 'string') {
            const buttons = this._processButtons(notificationButtons);
            return window.showInformationMessage(message, ...buttons).then((selection: string) => {
                this._handleNotificationButtonSelection(notificationButtons, selection);
            });
        }

        return null;
    }

    /**
     * Handle the scenario where the Streaming Analytics service credentials are not specified
     */
    public handleCredentialsMissing(): Thenable<void> {
        const notificationButtons = [{
            callbackFn: () => commands.executeCommand(Commands.SET_SERVICE_CREDENTIALS),
            label: 'Set credentials'
        }];
        const buttons = this._processButtons(notificationButtons);
        const message = 'Copy and paste your Streaming Analytics service credentials';
        return window.showErrorMessage(message, ...buttons).then((selection: string) => {
            this._handleNotificationButtonSelection(notificationButtons, selection);
        });
    }

    /**
     * Handle the scenario where the IBM Cloud Pak for Data URL is not specified, is invalid, or is unreachable
     * @param callbackFn    The callback function to execute after the user sets their URL
     */
    public handleIcp4dUrlNotSet(callbackFn: () => void): Thenable<void> {
        return this.handleError('IBM Cloud Pak for Data URL is not specified, is invalid, or is unreachable', {
            detail: 'Specify the IBM Cloud Pak for Data URL or build with IBM Cloud Streaming Analytics in the extension settings.',
            notificationButtons: [{
                callbackFn: () => commands.executeCommand(Commands.SET_ICP4D_URL, callbackFn),
                label: 'Set URL'
            }]
        });
    }

    /** Open the VS Code Settings */
    public async openSettingsPage(): Promise<void> {
        await commands.executeCommand('workbench.action.openSettings');
        await commands.executeCommand('settings.action.search');
    }

    /**
     * Retrieve the button labels to display
     * @param buttons    The notification buttons to display
     */
    private _processButtons(buttons: NotificationButton[]): string[] {
        let labels = [];
        if (Array.isArray(buttons)) {
            labels = _.map(buttons, (obj: NotificationButton) => obj.label);
        }
        return labels;
    }

    /**
     * Convert an array of messages to a string
     * @param msgArray    The messages
     */
    public joinMessageArray(msgArray: string | string[]): string {
        if (Array.isArray(msgArray)) {
            return msgArray
                .map((msg: string) => msg.replace(this._timestampRegex, ''))
                .join('\n').trimRight();
        }
        return msgArray;
    }

    /**
     * Not supported in VS Code
     */
    public dismissNotification(): null {
        return null;
    }

    /**
     * Converts messages to a loggable string
     * @param messages    The messages
     */
    public getLoggableMessage(messages: any[]): string {
        return this.joinMessageArray(messages.map((outputMsg: any) => outputMsg.message_text));
    }

    /**
     * Handle a notification button selection
     * @param buttons      The notification buttons to display
     * @param selection    The label of the button that the user clicked on
     */
    private _handleNotificationButtonSelection(buttons: NotificationButton[], selection: string): void {
        if (selection) {
            const buttonObj = _.find(buttons, (obj: NotificationButton) => obj.label === selection);
            if (buttonObj && buttonObj.callbackFn) {
                buttonObj.callbackFn();
            }
        }
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
            const displayPath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePath)}`;
            const outputChannel = Logger.registerOutputChannel(filePath, displayPath);
            outputChannel.show();
            return outputChannel;
        }
        return channelObj.outputChannel;
    }
}
