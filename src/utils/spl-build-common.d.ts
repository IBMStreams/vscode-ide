import { LintHandler, MessageHandler } from '.';

export class SplBuilder {
    static BUILD_ACTION: { DEFAULT: number, DOWNLOAD: number, SUBMIT: number };
    static SPL_MSG_REGEX: RegExp;
    static SPL_NAMESPACE_REGEX: RegExp;
    static SPL_MAIN_COMPOSITE_REGEX: RegExp;

    constructor(structure: { filePath: string, appRoot: string }, messageHandler: MessageHandler, lintHandler: LintHandler, openUrlHandler: Function, originator?: { originator: string, version: string, type: string });
    static getApplicationRoot(rootDirArray: Array<string>, filePath: string): string;
    buildSourceArchive(appRoot: string, toolkitRootPath: string, options: { useMakefile?: boolean, makefilePath?: string, fqn?: string }): Promise<string>;
    build(action: number, streamingAnalyticsCredentials: string, input: object): void;
    submit(streamingAnalyticsCredentials: string, input: object): void;
    openStreamingAnalyticsConsole(streamingAnalyticsCredentials: string): void;
    openCloudDashboard(): void;
}
