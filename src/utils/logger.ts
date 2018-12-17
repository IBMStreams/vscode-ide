'use strict';

import * as util from 'util';
import * as moment from 'moment';
import * as _ from 'underscore';

import { commands, window, ExtensionContext, OutputChannel } from 'vscode';

import { Commands } from '../commands';

export enum Level { DEBUG, ERROR, INFO, SUCCESS, WARN }

export class SplLogger {
    private static _context: ExtensionContext;
    private static _mainOutputChannel: OutputChannel;
    public static _outputChannels: Map<String, OutputChannel>;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this._context = context;
        this._outputChannels = new Map<String, OutputChannel>();
        
        // Set up main output channel for logging
        this._mainOutputChannel = this.registerOutputChannel('IBM Streams', 'IBM Streams');
    }

    /**
     * Create an output channel
     * @param name           The output channel name
     * @param displayName    The output channel name to display
     */
    public static registerOutputChannel(name: string, displayName: string): OutputChannel {
        let outputChannel = this._outputChannels.get(name);
        if (!outputChannel) {
            const channelName = displayName === 'IBM Streams' ? displayName : `IBM Streams: ${displayName}`;
            outputChannel = window.createOutputChannel(channelName);
            this._outputChannels.set(name, outputChannel);
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
     * Handle a build progress message
     * @param filePath            The associated file path
     * @param messageOutput       The build message(s)
     * @param showNotification    Whether to show a notification to the user
     */
    handleBuildProgressMessage(filePath: string, messageOutput: Array<any>|string, showNotification?: boolean): void {
        const outputChannel = SplLogger._outputChannels.get(filePath);
        if (Array.isArray(messageOutput)) {
            this.detectCurrentComposite(messageOutput);
            const message = this.getLoggableMessage(messageOutput);
            if (message) {
                SplLogger.debug(outputChannel, message, false, false, true);
            }
        } else if (typeof messageOutput === 'string') {
            showNotification ? SplLogger.info(outputChannel, messageOutput, true) : SplLogger.info(outputChannel, messageOutput);
        }
    }

    /**
     * Handle a build success message
     * @param filePath         The associated file path
     * @param messageOutput    The build message(s)
     */
    handleBuildSuccess(filePath: string, messageOutput: Array<any>): void {
        const outputChannel = SplLogger._outputChannels.get(filePath);
        this.detectCurrentComposite(messageOutput);
        const message = this.getLoggableMessage(messageOutput);
        if (message) {
            SplLogger.debug(outputChannel, message, false, false, true);
        }

        SplLogger.success(outputChannel, 'Build succeeded', true);
    }

    /**
     * Handle a build failure message
     * @param filePath         The associated file path
     * @param messageOutput    The build message(s)
     */
    handleBuildFailure(filePath: string, messageOutput: Array<any>): void {
        const outputChannel = SplLogger._outputChannels.get(filePath);
        this.detectCurrentComposite(messageOutput);
        const message = this.getLoggableMessage(messageOutput);
        if (message) {
            SplLogger.debug(outputChannel, message, false, false, true);
        }

        SplLogger.error(outputChannel, 'Build failed', true);
    }

    /**
     * Handle a submit job progress message
     * @param filePath    The associated file path
     * @param message     The message
     */
    handleSubmitProgressMessage(filePath: string, message: any): void {
        const outputChannel = SplLogger._outputChannels.get(filePath);
        if (typeof message === 'string') {
            window.showInformationMessage(message);
        }
        SplLogger.info(outputChannel, message);
    }

    /**
     * Handle a submit job success message
     * @param filePath               The associated file path
     * @param response               The submit response
     * @param notificationButtons    The notification buttons to display
     */
    handleSubmitSuccess(filePath: string, response: any, notificationButtons: Array<any>): void {
        const outputChannel = SplLogger._outputChannels.get(filePath);
        let labels = [];
        if (Array.isArray(notificationButtons)) {
            labels = _.map(notificationButtons, obj => obj.label);
        }
        window.showInformationMessage(`Job ${response.name} is ${response.health}`, ...labels)
            .then(selection => {
                if (selection) {
                    const buttonObj = _.find(notificationButtons, obj => obj.label === selection );
                    if (buttonObj && buttonObj.callbackFn) {
                        buttonObj.callbackFn();
                    }
                }
            });

        SplLogger.success(outputChannel, `Job ${response.name} is ${response.health}`);
    }

    /**
     * Handle a submit job failure message
     * @param filePath    The associated file path
     * @param response    The submit response
     */
    handleSubmitFailure(filePath: string, response: any): void {
        const outputChannel = SplLogger._outputChannels.get(filePath);
        const error = response.errors.map(err => err.message).join('\n');
        SplLogger.error(outputChannel, 'Job submission failed');
        SplLogger.error(outputChannel, error);
    }

    /**
     * Handle an error message
     * @param filePath               The associated file path
     * @param response               The response
     * @param notificationButtons    The notification buttons to display
     */
    handleError(filePath: string, response: any, notificationButtons: Array<any>): void {
        const outputChannel = SplLogger._outputChannels.get(filePath);
        let labels = [];
        if (Array.isArray(notificationButtons)) {
            labels = _.map(notificationButtons, obj => obj.label);
        }
        if (typeof response === 'string') {
            SplLogger.error(outputChannel, response);
            if (labels.length) {
                window.showErrorMessage(response, ...labels)
                    .then(selection => {
                        if (selection) {
                            const buttonObj = _.find(notificationButtons, obj => obj.label === selection );
                            if (buttonObj && buttonObj.callbackFn) {
                                buttonObj.callbackFn();
                            }
                        }
                    });
            } else {
                window.showErrorMessage(response);
            }
        }
        if (response && response.message) {
            SplLogger.error(outputChannel, response.message);
        }
        if (response && response.stack) {
            SplLogger.error(outputChannel, response.stack);
        }
    }

    /**
     * Handle a success message
     * @param filePath               The associated file path
     * @param response               The response
     * @param detail                 The message details
     * @param showNotification       Whether to show a notification to the user
     * @param showConsoleMsg         Whether to log the message
     * @param dialogButtons          The dialog buttons to display
     */
    handleSuccess(filePath: string, response: any, detail: string, showNotification?: boolean, showConsoleMsg?: boolean, dialogButtons?: Array<any>): void {
        const outputChannel = SplLogger._outputChannels.get(filePath);
        if (showNotification && dialogButtons) {
            this.showDialog(response, detail, dialogButtons);
        }

        if (showConsoleMsg) {
            showNotification ? SplLogger.success(outputChannel, `${response}\n${detail}`, true) : SplLogger.success(outputChannel, `${response}\n${detail}`);
        }
    }

    /**
     * Show a dialog to the user
     * @param message          The message to display
     * @param detail           The detailed message to display
     * @param dialogButtons    The dialog buttons to display
     */
    showDialog(message: string, detail: string, dialogButtons: Array<any>): void {
        let labels = [];
        if (Array.isArray(dialogButtons)) {
            var hasCancelButton = dialogButtons.some(obj => obj.label === 'Cancel' || obj.label === 'Close');
            if (!hasCancelButton) {
                dialogButtons.push({ label: 'Cancel', callbackFn: null });
            }
            labels = _.map(dialogButtons, obj => ({
                title: obj.label,
                isCloseAffordance: obj.label === 'Cancel' || obj.label === 'Close' ? false : true
            }));
        }

        const displayMessage = detail ? `${message}\n\n${detail}` : message;
        window.showInformationMessage(displayMessage, { modal: true }, ...labels)
            .then(selection => {
                if (selection) {
                    const labelObj = _.find(dialogButtons, obj => obj.label === selection.title );
                    if (labelObj && labelObj.callbackFn) {
                        labelObj.callbackFn();
                    }
                }
            });
    }

    /**
     * Handle the scenario where the Streaming Analytics service credentials are missing
     */
    handleCredentialsMissing() {
        const callbackFn = () => window.showInformationMessage('Please re-build your application(s)');
        commands.executeCommand(Commands.SET_SERVICE_CREDENTIALS, callbackFn);
    }

    /**
     * Converts the build output into a loggable string
     * @param messages    The build message output
     */
    private getLoggableMessage(messages: Array<any>): string {
        return messages
            .map(outputMsg => outputMsg.message_text)
            .join('\n')
            .trimRight();
    }

    /**
     * Parse the build output and show a notification for the
     * composite that is currently being built.
     * @param messages    The build message output
     */
    private detectCurrentComposite(messages: Array<any>): void {
        const scCommandRegExp = /sc\s+.*\s([A-Za-z_.]+)::([A-Za-z_]+).*$/;
        const composites = _.chain(messages)
            .filter(obj => obj.message_text.match(scCommandRegExp))
            .map(obj => {
                const match = obj.message_text.match(scCommandRegExp);
                return `${match[1]}::${match[2]}`;
            })
            .value();
        _.each(composites, composite => window.showInformationMessage(`Building ${composite}...`));
    }
}
