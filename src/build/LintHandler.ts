
import { SplLinter } from '../utils';
import StreamsUtils from './v5/util/streams-utils';

export default class LintHandler {
    private msgRegex: RegExp;
    private appRoot: string;

    /**
     * @param appRoot    The application root path
     */
    constructor(appRoot: string) {
        this.msgRegex = StreamsUtils.SPL_MSG_REGEX;
        this.appRoot = appRoot;
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
                .filter((message: string) => message.match(this.msgRegex));

            SplLinter.lintFiles(this.msgRegex, this.appRoot, messages);
        } else if (Array.isArray(response) && response.every((message: any) => typeof message === 'string')) {
            SplLinter.lintFiles(this.msgRegex, this.appRoot, response);
        }
    }
}
