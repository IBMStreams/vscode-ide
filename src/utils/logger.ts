'use strict';

import * as path from 'path';
import * as util from 'util';
import * as moment from 'moment';
import * as _ from 'underscore';

import { commands, window, ExtensionContext, OutputChannel } from 'vscode';

import { Commands } from '../commands';

export enum Level { DEBUG, ERROR, INFO, SUCCESS, WARN }

export class SplLogger {
    private static _context: ExtensionContext;
    private static _mainOutputChannel: OutputChannel;
    public static _outputChannels: Object;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this._context = context;
        this._outputChannels = {};

        // Set up main output channel for logging
        this._mainOutputChannel = this.registerOutputChannel('IBM Streams', 'IBM Streams');
    }

    /**
     * Create an output channel
     * @param name           The output channel name
     * @param displayName    The output channel name to display
     */
    public static registerOutputChannel(name: string, displayName: string): OutputChannel {
        let outputChannel = null;
        if (this._outputChannels[name]) {
            outputChannel = this._outputChannels[name].outputChannel;
        } else {
            const channelName = displayName === 'IBM Streams' ? displayName : `IBM Streams: ${displayName}`;
            outputChannel = window.createOutputChannel(channelName);
            this._outputChannels[name] = {
                displayName: displayName,
                outputChannel: outputChannel
            };
            this._context.subscriptions.push(outputChannel);
        }
        return outputChannel;
    }

    /**
     * Handle messages at the debug level
     * @param outputChannel        The output channel
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     * @param hideLogTypePrefix    Whether to hide log type prefix in output channel message
     */
    public static debug(outputChannel: OutputChannel, message: string, showNotification?: boolean, showOutputChannel?: boolean, hideLogTypePrefix?: boolean): void {
        this.handleMessage(outputChannel, message, Level.DEBUG, showNotification, showOutputChannel, hideLogTypePrefix);
    }

    /**
     * Handle messages at the error level
     * @param outputChannel        The output channel
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     */
    public static error(outputChannel: OutputChannel, message: string, showNotification?: boolean, showOutputChannel?: boolean): void {
        this.handleMessage(outputChannel, message, Level.ERROR, showNotification, showOutputChannel);
    }

    /**
     * Handle messages at the info level
     * @param outputChannel        The output channel
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     */
    public static info(outputChannel: OutputChannel, message: string, showNotification?: boolean, showOutputChannel?: boolean): void {
        this.handleMessage(outputChannel, message, Level.INFO, showNotification, showOutputChannel);
    }

    /**
     * Handle messages at the success level
     * @param outputChannel        The output channel
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     */
    public static success(outputChannel: OutputChannel, message: string, showNotification?: boolean, showOutputChannel?: boolean): void {
        this.handleMessage(outputChannel, message, Level.SUCCESS, showNotification, showOutputChannel);
    }

    /**
     * Handle messages at the warn level
     * @param outputChannel        The output channel
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     */
    public static warn(outputChannel: OutputChannel, message: string, showNotification?: boolean, showOutputChannel?: boolean): void {
        this.handleMessage(outputChannel, message, Level.WARN, showNotification, showOutputChannel);
    }

    /**
     * Handle messages at all levels
     * @param outputChannel        The output channel
     * @param message              The message to log
     * @param logLevel             The log level
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     * @param throwError           Whether to throw an error
     * @param hideLogTypePrefix    Whether to hide log type prefix in output channel message
     */
    private static handleMessage(outputChannel: OutputChannel, message: string, logLevel: number, showNotification?: boolean, showOutputChannel?: boolean, hideLogTypePrefix?: boolean): void {
        if (!message || message.trim() === '') {
            return;
        }

        console.log(message);
        if (showNotification) {
            switch(logLevel) {
                case Level.DEBUG:
                case Level.INFO:
                case Level.SUCCESS:
                    window.showInformationMessage(message);
                    break;
                case Level.ERROR:
                    window.showErrorMessage(message);
                    break;
                case Level.WARN:
                    window.showWarningMessage(message);
                    break;
            }
        }

        const channel = outputChannel ? outputChannel : this._mainOutputChannel;
        this.logToOutputChannel(channel, message, logLevel, showOutputChannel, hideLogTypePrefix);
    }

    /**
     * Log a message to the output channel
     * @param outputChannel        The output channel
     * @param message              The message to log
     * @param logLevel             The log level
     * @param showOutputChannel    Whether to switch focus to the output channel
     * @param hideLogTypePrefix    Whether to hide log type prefix in output channel message
     */
    private static logToOutputChannel(outputChannel: OutputChannel, message: string, logLevel: number, showOutputChannel?: boolean, hideLogTypePrefix?: boolean): void {
        if (!outputChannel) {
            return;
        }

        const levelBufferWhitespace = new Array(Level[3].length - Level[logLevel].length + 1).join(' ');
        const messageBufferWhitespace = message.includes('\n') ? '\n' : '  ';
        if (showOutputChannel) {
            outputChannel.show(true);
        }
        if (hideLogTypePrefix) {
            outputChannel.appendLine(message);
        } else {
            outputChannel.appendLine(util.format('[SPL %s][%s]%s%s%s', moment().format(), Level[logLevel], levelBufferWhitespace, messageBufferWhitespace, message));
        }
    }
}

export class MessageHandler {
    /**
     * Handle an info message
     * @param message                The message to display
     * @param detail                 The message detail
     * @param showNotification       Whether to show a notification to the user
     * @param showConsoleMessage     Whether to log to the output channel
     * @param notificationButtons    The notification buttons to display
     * @param structure              The associated file path and application root
     */
    handleInfo(
        message: string,
        {
            detail = null,
            showNotification = true,
            showConsoleMessage = true,
            notificationButtons = [],
            structure = null
        }: {
            detail?: Array<string>,
            showNotification?: boolean,
            showConsoleMessage?: boolean,
            notificationButtons?: Array<any>,
            structure?: { filePath: string, appRoot: string }
        } = {}
    ): Thenable<void> {
        if (showConsoleMessage) {
            const outputChannel = this.getOutputChannel(structure);
            const detailMessage = this.joinMessageArray(detail);
            const logMessage = `${message}${detailMessage ? '\n' + detailMessage : ''}`;
            SplLogger.debug(outputChannel, logMessage, false, false, true);
        }

        if (showNotification && typeof message === 'string') {
            const buttons = this.processButtons(notificationButtons);
            return window.showInformationMessage(message, ...buttons).then(selection => {
                this.handleNotificationButtonSelection(notificationButtons, selection);
            });
        }
    }

    /**
     * Handle an error message
     * @param message                The message to display
     * @param detail                 The error detail
     * @param stack                  The error stack
     * @param showNotification       Whether to show a notification to the user
     * @param showConsoleMessage      Whether to log to the output channel
     * @param consoleErrorLog        Whether to log to the console
     * @param notificationButtons    The notification buttons to display
     * @param structure              The associated file path and application root
     */
    handleError(
        message: string,
        {
            detail,
            stack,
            showNotification = true,
            showConsoleMessage = true,
            consoleErrorLog = true,
            notificationButtons = [],
            structure = null
        }: {
            detail?: Array<string>,
            stack?: Array<string>,
            showNotification?: boolean,
            showConsoleMessage?: boolean,
            consoleErrorLog?: boolean,
            notificationButtons?: Array<any>,
            structure?: { filePath: string, appRoot: string }
        } = {}
    ): Thenable<void> {
        if (consoleErrorLog) {
            if (stack) {
                console.error(message, stack);
            } else {
                console.error(message);
            }
        }

        if (showConsoleMessage) {
            const outputChannel = this.getOutputChannel(structure);
            const detailMessage = this.joinMessageArray(detail);
            const stackMessage = this.joinMessageArray(stack);
            SplLogger.error(outputChannel, message);
            if (typeof detailMessage === 'string' && detailMessage.length) {
                SplLogger.error(outputChannel, detailMessage);
            }
            if (typeof stackMessage === 'string' && stackMessage.length) {
                SplLogger.error(outputChannel, stackMessage);
            }
        }

        if (showNotification && typeof message === 'string') {
            const buttons = this.processButtons(notificationButtons);
            return window.showErrorMessage(message, ...buttons).then(selection => {
                this.handleNotificationButtonSelection(notificationButtons, selection);
            });
        }
    }

    /**
     * Handle a success message
     * @param message                The message to display
     * @param detail                 The message detail
     * @param showNotification       Whether to show a notification to the user
     * @param showConsoleMessage     Whether to log to the output channel
     * @param notificationButtons    The notification buttons to display
     * @param structure              The associated file path and application root
     */
    handleSuccess (
        message: string,
        {
            detail = null,
            showNotification = true,
            showConsoleMessage = true,
            notificationButtons = [],
            structure = null
        }: {
            detail?: Array<string>,
            showNotification?: boolean,
            showConsoleMessage?: boolean,
            notificationButtons?: Array<any>,
            structure?: { filePath: string, appRoot: string }
        } = {}
    ): Thenable<void> {
        if (showConsoleMessage) {
            const outputChannel = this.getOutputChannel(structure);
            const detailMessage = this.joinMessageArray(detail);
            const logMessage = `${message}${detailMessage ? '\n' + detailMessage : ''}`;
            SplLogger.success(outputChannel, logMessage);
        }

        if (showNotification && typeof message === 'string') {
            const buttons = this.processButtons(notificationButtons);
            return window.showInformationMessage(message, ...buttons).then(selection => {
                this.handleNotificationButtonSelection(notificationButtons, selection);
            });
        }
    }

    /**
     * Handle the scenario where the Streaming Analytics service credentials are missing
     */
    handleCredentialsMissing(): Thenable<void> {
        const notificationButtons = [{
            label: 'Set credentials',
            callbackFn: () => commands.executeCommand(Commands.SET_SERVICE_CREDENTIALS)
        }];
        const buttons = this.processButtons(notificationButtons);
        const message = 'Copy and paste your Streaming Analytics service credentials';
        return window.showErrorMessage(message, ...buttons).then(selection => {
            this.handleNotificationButtonSelection(notificationButtons, selection);
        });
    }

    /**
     * Converts messages to a loggable string
     * @param messages    The messages
     */
    getLoggableMessage(messages: Array<any>): string {
        return this.joinMessageArray(messages.map(outputMsg => outputMsg.message_text));
    }

    /**
     * Retrieve an output channel
     * @param structure    The associated file path and application root
     */
    private getOutputChannel(structure: { filePath: string, appRoot: string }): OutputChannel {
        const channelObj = SplLogger._outputChannels[structure.filePath];
        if (!channelObj) {
            const displayPath = `${path.basename(structure.appRoot)}${path.sep}${path.relative(structure.appRoot, structure.filePath)}`;
            const outputChannel = SplLogger.registerOutputChannel(structure.filePath, displayPath);
            outputChannel.show();
            return outputChannel;
        } else {
            return channelObj.outputChannel;
        }
    }

    /**
     * Retrieve the button labels to display
     * @param notificationButtons    The notification buttons to display
     */
    private processButtons(notificationButtons: Array<any>): string[] {
        let labels = [];
        if (Array.isArray(notificationButtons)) {
            labels = _.map(notificationButtons, obj => obj.label);
        }
        return labels;
    }

    /**
     * Convert an array of messages to a string
     * @param msgArray    The messages
     */
    private joinMessageArray(msgArray: Array<string>): string {
        if (Array.isArray(msgArray)) {
            return msgArray.join('\n').trimRight();
        }
        return msgArray;
    }

    /**
     * Handle a notification button selection
     * @param notificationButtons    The notification buttons to display
     * @param selection              The label of the button that the user clicked on
     */
    private handleNotificationButtonSelection(notificationButtons: Array<any>, selection: string): void {
        if (selection) {
            const buttonObj = _.find(notificationButtons, (obj: any) => obj.label === selection);
            if (buttonObj && buttonObj.callbackFn) {
                buttonObj.callbackFn();
            }
        }
    }

    private dismissNotification(notification) {}
}
