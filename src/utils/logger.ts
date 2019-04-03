import * as moment from 'moment';
import * as util from 'util';
import { OutputChannel, window } from 'vscode';

export enum Level { DEBUG, ERROR, INFO, SUCCESS, WARN }

export class SplLogger {
    public static _mainOutputChannel: OutputChannel;
    public static _outputChannels: object;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(): void {
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
                displayName,
                outputChannel
            };
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
            switch (logLevel) {
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
            outputChannel.appendLine(util.format('[%s][%s]%s%s%s', moment().format(), Level[logLevel], levelBufferWhitespace, messageBufferWhitespace, message));
        }
    }
}
