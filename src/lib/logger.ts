'use strict';

import * as util from 'util';
import * as moment from 'moment';
import * as _ from 'underscore';

import { window, OutputChannel } from 'vscode';

export enum Level { DEBUG, ERROR, INFO, SUCCESS, WARN }

export class SplLogger {
    private static _outputChannel: OutputChannel;

    /**
     * @param channel    Output channel for logging messages
     */
    public static registerOutputPanel(channel: OutputChannel): void {

        this._outputChannel = channel;
    }

    /**
     * Handle messages at the debug level
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     * @param hideLogTypePrefix    Whether to hide log type prefix in output channel message
     */
    public static debug(message: string, showNotification?: boolean, showOutputChannel?: boolean, hideLogTypePrefix?: boolean): void {
        this.handleMessage(message, Level.DEBUG, showNotification, showOutputChannel, hideLogTypePrefix);
    }

    /**
     * Handle messages at the error level
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     */
    public static error(message: string, showNotification?: boolean, showOutputChannel?: boolean): void {
        this.handleMessage(message, Level.ERROR, showNotification, showOutputChannel);
    }

    /**
     * Handle messages at the info level
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     */
    public static info(message: string, showNotification?: boolean, showOutputChannel?: boolean): void {
        this.handleMessage(message, Level.INFO, showNotification, showOutputChannel);
    }

    /**
     * Handle messages at the success level
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     */
    public static success(message: string, showNotification?: boolean, showOutputChannel?: boolean): void {
        this.handleMessage(message, Level.SUCCESS, showNotification, showOutputChannel);
    }

    /**
     * Handle messages at the warn level
     * @param message              The message to log
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     */
    public static warn(message: string, showNotification?: boolean, showOutputChannel?: boolean): void {
        this.handleMessage(message, Level.WARN, showNotification, showOutputChannel);
    }

    /**
     * Handle messages at all levels
     * @param message              The message to log
     * @param logLevel             The log level
     * @param showNotification     Whether to show a notification to the user
     * @param showOutputChannel    Whether to switch focus to the output channel
     * @param throwError           Whether to throw an error
     * @param hideLogTypePrefix    Whether to hide log type prefix in output channel message
     */
    private static handleMessage(message: string, logLevel: number, showNotification?: boolean, showOutputChannel?: boolean, hideLogTypePrefix?: boolean): void {
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
        this.logToOutputChannel(message, logLevel, showOutputChannel, hideLogTypePrefix);
    }

    /**
     * Log a message to the output channel
     * @param message              The message to log
     * @param logLevel             The log level
     * @param showOutputChannel    Whether to switch focus to the output channel
     * @param hideLogTypePrefix    Whether to hide log type prefix in output channel message
     */
    private static logToOutputChannel(message: string, logLevel: number, showOutputChannel?: boolean, hideLogTypePrefix?: boolean): void {
        if (!this._outputChannel) {
            return;
        }

        const levelBufferWhitespace = new Array(Level[3].length - Level[logLevel].length + 1).join(' ');
        const messageBufferWhitespace = message.includes('\n') ? '\n' : '  ';
        if (showOutputChannel) {
            this._outputChannel.show(true);
        }
        if (hideLogTypePrefix) {
            this._outputChannel.appendLine(message);
        } else {
            this._outputChannel.appendLine(util.format('[SPL %s][%s]%s%s%s', moment().format(), Level[logLevel], levelBufferWhitespace, messageBufferWhitespace, message));
        }
    }
}

export class MessageHandler {
    /**
     * Handle a build progress message
     * @param messageOutput       The build message(s)
     * @param showNotification    Whether to show a notification to the user
     */
    handleBuildProgressMessage(messageOutput: Array<any>|string, showNotification?: boolean): void {
        if (Array.isArray(messageOutput)) {
            this.detectCurrentComposite(messageOutput);
            const message = this.getLoggableMessage(messageOutput);
            if (message) {
                SplLogger.debug(message, false, false, true);
            }
        } else if (typeof messageOutput === 'string') {
            showNotification ? SplLogger.info(messageOutput, true) : SplLogger.info(messageOutput);
        }
    }

    /**
     * Handle a build success message
     * @param messageOutput    The build message(s)
     */
    handleBuildSuccess(messageOutput: Array<any>): void {
        this.detectCurrentComposite(messageOutput);
        const message = this.getLoggableMessage(messageOutput);
        if (message) {
            SplLogger.debug(message, false, false, true);
        }

        SplLogger.success('Build succeeded', true);
    }

    /**
     * Handle a build failure message
     * @param messageOutput    The build message(s)
     */
    handleBuildFailure(messageOutput: Array<any>): void {
        this.detectCurrentComposite(messageOutput);
        const message = this.getLoggableMessage(messageOutput);
        if (message) {
            SplLogger.debug(message, false, false, true);
        }

        SplLogger.error('Build failed', true);
    }

    handleSubmitProgressMessage(response: any): void {

    }

    /**
     * Handle a submit job success message
     * @param response    The submit response
     */
    handleSubmitSuccess(response: any): void {
        SplLogger.success(`Job ${response.name} is ${response.health}`);
    }

    /**
     * Handle a submit job failure message
     * @param response    The submit response
     */
    handleSubmitFailure(response: any): void {
        const error = response.errors.map(err => err.message).join('\n');
        SplLogger.error('Job submission failed');
        SplLogger.error(error);
    }

    /*
     * Handle an error message
     * @param response    The response
     */
    handleError(response: any): void {
        if (typeof response === 'string') {
            throw new Error(response);
        } else if (response.message) {
            SplLogger.error(response.message);
            throw response;
        }
    }

    /**
     * Handle a success message
     * @param response    The response
     */
    handleSuccess(response: any, detail: string, showNotification?: boolean): void {
        if (showNotification) {
            SplLogger.success(response, true);
            SplLogger.debug(detail);
        }
    }

    /**
     * Show a dialog to the user
     * @param message         The message to display
     * @param detail          The detailed message to display
     * @param buttonLabels    The button labels to display and associated callback functions
     */
    showDialog(message: string, detail: string, buttonLabels: Array<any>): void {
        let labels = _.map(buttonLabels, obj => ({
            title: obj.label,
            isCloseAffordance: obj.label === 'Close' ? true : false
        }));
        window.showInformationMessage(`${message}\n\n${detail}`, { modal: true }, ...labels)
            .then(selection => {
                if (selection) {
                    const labelObj = _.find(buttonLabels, obj => obj.label === selection.title );
                    if (labelObj && labelObj.callbackFn) {
                        labelObj.callbackFn();
                    }
                }
            });
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
        const scCommandRegExp = /^\s*\/opt\/ibm\/InfoSphere_Streams.*\s([A-Za-z_.]+)::([A-Za-z_]+).*$/;
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
