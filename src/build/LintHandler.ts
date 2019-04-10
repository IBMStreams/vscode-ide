import * as path from 'path';
import { DiagnosticSeverity } from 'vscode';
import { Diagnostics, Settings } from '../utils';
import { StreamsUtils } from './v5/util';

/**
 * Handles linting of source files
 */
export default class LintHandler {
    private _msgRegex: RegExp;
    private _appRoot: string;
    private _apiVersion: string;

    /**
     * @param appRoot       The application root path
     * @param apiVersion    The Streams API version
     */
    constructor(appRoot: string, apiVersion: string) {
        this._msgRegex = apiVersion === Settings.TARGET_VERSION_OPTION.V4 ? StreamsUtils.SPL_MSG_REGEX : StreamsUtils.SPL_MSG_REGEX_V5;
        this._appRoot = appRoot;
        this._apiVersion = apiVersion;
    }

    /**
     * Parse a build response and lint source file(s)
     * @param response    The build response
     */
    public lint(response: any): void {
        if (!response) {
            return;
        }

        let messages = [];
        if (this._apiVersion === Settings.TARGET_VERSION_OPTION.V5) {
            messages = response;
        } else {
            messages = response.output.map((message: any) => message.message_text);
        }

        if (Array.isArray(messages)) {
            const convertedMessages = messages
                .filter((message: string) => message.match(this._msgRegex))
                .map((message: string) => this._parseMessage(message));
            Diagnostics.lintFiles(this._msgRegex, this._appRoot, convertedMessages);
        }
    }

    /**
     * Parse build message for relevant information
     * @param message    The build message
     */
    private _parseMessage(message: string): any {
        const parts = message.match(this._msgRegex);
        if (parts && parts.length > 4) {
            const severityCode = parts[4].trim().substr(parts[4].trim().length - 1);
            let severity = DiagnosticSeverity.Information;
            if (severityCode) {
                switch (severityCode) {
                    case 'I':
                        severity = DiagnosticSeverity.Information;
                        break;
                    case 'W':
                        severity = DiagnosticSeverity.Warning;
                        break;
                    case 'E':
                        severity = DiagnosticSeverity.Error;
                        break;
                    default:
                        break;
                }
            }

            let absolutePath = parts[1];
            if (this._appRoot && typeof (this._appRoot) === 'string') {
                absolutePath = `${this._appRoot}${path.sep}${parts[1]}`;
            }

            return {
                severity,
                file: absolutePath,
                line: parseInt(parts[2], 10),
                column: parseInt(parts[3], 10),
                code: parts[4],
                description: parts[5]
            };
        }
    }
}
