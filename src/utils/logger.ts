import * as util from 'util';
import { OutputChannel, window } from 'vscode';
import { EXTENSION_NAME, LANGUAGE_SERVER } from '.';

enum Level {
  DEBUG,
  ERROR,
  INFO,
  SUCCESS,
  WARN
}

/**
 * Manages message logging to output channels
 */
export default class Logger {
  public static mainOutputChannel: OutputChannel;
  public static languageServerOutputChannel: OutputChannel;
  public static outputChannels: object;

  /**
   * Perform initial configuration
   * @param context the extension context
   */
  public static configure(): void {
    Logger.outputChannels = {};

    // Set up main output channel for logging
    Logger.mainOutputChannel = Logger.registerOutputChannel(
      EXTENSION_NAME,
      EXTENSION_NAME
    );

    // Set up language server output channel for logging
    Logger.languageServerOutputChannel = Logger.registerOutputChannel(
      LANGUAGE_SERVER,
      LANGUAGE_SERVER
    );
  }

  /**
   * Create an output channel
   * @param name the output channel name
   * @param displayName the output channel name to display
   */
  public static registerOutputChannel(
    name: string,
    displayName: string
  ): OutputChannel {
    let outputChannel = null;
    const existingOutputChannel = Logger.outputChannels[name];
    if (existingOutputChannel) {
      outputChannel = existingOutputChannel.channel;
    } else {
      const channelName =
        displayName === EXTENSION_NAME || displayName === LANGUAGE_SERVER
          ? displayName
          : `${EXTENSION_NAME}: ${displayName}`;
      outputChannel = window.createOutputChannel(channelName);
      Logger.outputChannels[name] = {
        displayName,
        outputChannel
      };
    }
    return outputChannel;
  }

  /**
   * Convert content to a loggable message
   * @param content the content to log
   */
  public static getLoggableMessage(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      const timestampRegex = /^[0-9][\w-:.+]+\s/;
      return content
        .map((msg: string) => (msg ? msg.replace(timestampRegex, '') : ''))
        .join('\n')
        .trimRight();
    }
    return content;
  }

  /**
   * Handle messages at the debug level
   * @param outputChannel the output channel
   * @param message the message to log
   * @param showNotification whether to show a notification to the user
   * @param showOutputChannel whether to switch focus to the output channel
   * @param hideLogTypePrefix whether to hide log type prefix in output channel message
   */
  public static debug(
    outputChannel: OutputChannel,
    message: string,
    showNotification?: boolean,
    showOutputChannel?: boolean,
    hideLogTypePrefix?: boolean
  ): void {
    Logger.handleMessage(
      outputChannel,
      message,
      Level.DEBUG,
      showNotification,
      showOutputChannel,
      hideLogTypePrefix
    );
  }

  /**
   * Handle messages at the error level
   * @param outputChannel the output channel
   * @param message the message to log
   * @param showNotification whether to show a notification to the user
   * @param showOutputChannel whether to switch focus to the output channel
   */
  public static error(
    outputChannel: OutputChannel,
    message: string,
    showNotification?: boolean,
    showOutputChannel?: boolean
  ): void {
    Logger.handleMessage(
      outputChannel,
      message,
      Level.ERROR,
      showNotification,
      showOutputChannel
    );
  }

  /**
   * Handle messages at the info level
   * @param outputChannel the output channel
   * @param message the message to log
   * @param showNotification whether to show a notification to the user
   * @param showOutputChannel whether to switch focus to the output channel
   */
  public static info(
    outputChannel: OutputChannel,
    message: string,
    showNotification?: boolean,
    showOutputChannel?: boolean
  ): void {
    Logger.handleMessage(
      outputChannel,
      message,
      Level.INFO,
      showNotification,
      showOutputChannel
    );
  }

  /**
   * Handle messages at the success level
   * @param outputChannel the output channel
   * @param message the message to log
   * @param showNotification whether to show a notification to the user
   * @param showOutputChannel whether to switch focus to the output channel
   */
  public static success(
    outputChannel: OutputChannel,
    message: string,
    showNotification?: boolean,
    showOutputChannel?: boolean
  ): void {
    Logger.handleMessage(
      outputChannel,
      message,
      Level.SUCCESS,
      showNotification,
      showOutputChannel
    );
  }

  /**
   * Handle messages at the warn level
   * @param outputChannel the output channel
   * @param message the message to log
   * @param showNotification whether to show a notification to the user
   * @param showOutputChannel whether to switch focus to the output channel
   */
  public static warn(
    outputChannel: OutputChannel,
    message: string,
    showNotification?: boolean,
    showOutputChannel?: boolean
  ): void {
    Logger.handleMessage(
      outputChannel,
      message,
      Level.WARN,
      showNotification,
      showOutputChannel
    );
  }

  /**
   * Handle messages at all levels
   * @param outputChannel the output channel
   * @param message the message to log
   * @param logLevel the log level
   * @param showNotification whether to show a notification to the user
   * @param showOutputChannel whether to switch focus to the output channel
   * @param throwError whether to throw an error
   * @param hideLogTypePrefix whether to hide log type prefix in output channel message
   */
  private static handleMessage(
    outputChannel: OutputChannel,
    message: string,
    logLevel: number,
    showNotification?: boolean,
    showOutputChannel?: boolean,
    hideLogTypePrefix?: boolean
  ): void {
    if (!message || message.trim() === '') {
      return;
    }

    if (message && showNotification) {
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
        default:
          break;
      }
    }

    const channel = outputChannel || Logger.mainOutputChannel;
    Logger.logToOutputChannel(
      channel,
      message,
      logLevel,
      showOutputChannel,
      hideLogTypePrefix
    );
  }

  /**
   * Log a message to the output channel
   * @param outputChannel the output channel
   * @param message the message to log
   * @param logLevel the log level
   * @param showOutputChannel whether to switch focus to the output channel
   * @param hideLogTypePrefix whether to hide log type prefix in output channel message
   */
  private static logToOutputChannel(
    outputChannel: OutputChannel,
    message: string,
    logLevel: number,
    showOutputChannel?: boolean,
    hideLogTypePrefix?: boolean
  ): void {
    if (!outputChannel) {
      return;
    }

    if (showOutputChannel) {
      outputChannel.show(true);
    }
    if (hideLogTypePrefix) {
      outputChannel.appendLine(message);
    } else {
      outputChannel.appendLine(
        util.format(
          '[%s][%s]%s%s',
          this.getCurrentDateTime(),
          Level[logLevel],
          message.startsWith('\n') ? '' : ' ',
          message
        )
      );
    }
  }

  /**
   * Get the current date and time in ISO 8601 format (e.g., `2000-01-01T12:00:00-07:00`)
   */
  private static getCurrentDateTime(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());
    const hours = this.pad(date.getHours());
    const minutes = this.pad(date.getMinutes());
    const seconds = this.pad(date.getSeconds());
    const timezoneOffset = -date.getTimezoneOffset();
    const diff = timezoneOffset >= 0 ? '+' : '-';
    const timezone = `${this.pad(timezoneOffset / 60)}:${this.pad(
      timezoneOffset % 60
    )}`;
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${diff}${timezone}`;
  }

  /**
   * Pad a number
   * @param num the number to pad
   */
  private static pad(num: number): string {
    const norm = Math.floor(Math.abs(num));
    return (norm < 10 ? '0' : '') + norm;
  }
}
