
import { Diagnostics } from '../utils';
import { StreamsUtils } from './v5/util';

/**
 * Handles linting of source files
 */
export default class LintHandler {
    private _msgRegex: RegExp;
    private _appRoot: string;

    /**
     * @param appRoot    The application root path
     */
    constructor(appRoot: string) {
        this._msgRegex = StreamsUtils.SPL_MSG_REGEX;
        this._appRoot = appRoot;
    }

    /**
     * Parse a build response and lint source file(s)
     * @param response    The build response
     */
    public lint(response: any): void {
        if (!response) {
            return;
        }

        if (response.output && Array.isArray(response.output)) {
            const messages = response.output
                .map((message: any) => message.message_text)
                .filter((message: string) => message.match(this._msgRegex));

            Diagnostics.lintFiles(this._msgRegex, this._appRoot, messages);
        } else if (Array.isArray(response) && response.every((message: any) => typeof message === 'string')) {
            Diagnostics.lintFiles(this._msgRegex, this._appRoot, response);
        }
    }
}
