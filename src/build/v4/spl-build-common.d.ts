import MessageHandler from '../MessageHandler';
import LintHandler from '../LintHandler';

export const ibmCloudDashboardUrl: string;

export class SplBuilder {
    public static BUILD_ACTION: { DOWNLOAD: number, SUBMIT: number };
    public static SPL_MSG_REGEX: RegExp;
    public static SPL_NAMESPACE_REGEX: RegExp;
    public static SPL_MAIN_COMPOSITE_REGEX: RegExp;

    constructor(messageHandler: MessageHandler, lintHandler: LintHandler, openUrlHandler: Function, originator?: object, identifier?: { appRoot?: string, fqn?: string, makefilePath?: string });
    public static getApplicationRoot(rootDirArray: string[], filePath: string): string;
    public buildSourceArchive(appRoot: string, toolkitRootPath: string, options: { useMakefile?: boolean, makefilePath?: string, fqn?: string }): Promise<string>;
    public build(action: number, streamingAnalyticsCredentials: string, input: object): void;
    public submit(streamingAnalyticsCredentials: string, input: object): void;
    public openStreamingAnalyticsConsole(streamingAnalyticsCredentials: string, callback: Function): void;
    public openCloudDashboard(callback: Function): void;
}

export class SplBuildCommonV4 {
    public static setTimeout(timeoutInSeconds: number): void;
}
