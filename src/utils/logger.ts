import { LogLevel } from '@ibmstreams/common';
import * as util from 'util';
import { OutputChannel, window } from 'vscode';
import { EXTENSION_NAME, LANGUAGE_SERVER } from '.';

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
   * Log message
   * @param logLevel the log level
   * @param outputChannel the output channel
   * @param message the message to log
   * @param showOutputChannel whether to switch focus to the output channel
   * @param hideLogTypePrefix whether to hide log type prefix in output channel message
   */
  public static log(
    logLevel: LogLevel,
    outputChannel: OutputChannel,
    message: string,
    showOutputChannel?: boolean,
    hideLogTypePrefix?: boolean
  ): void {
    if (!message || message.trim() === '') {
      return;
    }
    const channel = outputChannel || Logger.mainOutputChannel;
    if (!channel) {
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
          logLevel.toUpperCase(),
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
    const milliseconds = this.pad(date.getMilliseconds());
    const timezoneOffset = -date.getTimezoneOffset();
    const diff = timezoneOffset >= 0 ? '+' : '-';
    const timezone = `${this.pad(timezoneOffset / 60)}:${this.pad(
      timezoneOffset % 60
    )}`;
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${diff}${timezone}`;
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
