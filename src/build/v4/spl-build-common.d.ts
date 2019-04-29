import MessageHandler from '../../build/MessageHandler';
import LintHandler from '../../build/LintHandler';

export class SplBuilder {
    static BUILD_ACTION: { DOWNLOAD: number, SUBMIT: number };
    static SPL_MSG_REGEX: RegExp;
    static SPL_NAMESPACE_REGEX: RegExp;
    static SPL_MAIN_COMPOSITE_REGEX: RegExp;

    constructor(messageHandler: MessageHandler, lintHandler: LintHandler, openUrlHandler: Function, originator?: object, identifier?: { appRoot?: string, fqn?: string, makefilePath?: string });
    public static getApplicationRoot(rootDirArray: Array<string>, filePath: string): string;
    public buildSourceArchive(appRoot: string, toolkitRootPath: string, options: { useMakefile?: boolean, makefilePath?: string, fqn?: string }): Promise<string>;
    public build(action: number, streamingAnalyticsCredentials: string, input: object): void;
    public submit(streamingAnalyticsCredentials: string, input: object): void;
    public openStreamingAnalyticsConsole(streamingAnalyticsCredentials: string, callback: Function): void;
    public openCloudDashboard(callback: Function): void;
}

export class SplBuildCommonV4 {
    public static setTimeout(timeoutInSeconds: number): void;
}
