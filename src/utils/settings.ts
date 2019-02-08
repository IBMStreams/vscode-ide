'use strict';

export namespace Settings {
    export const ID = 'ibm-streams';
    export const SPL_ID = 'spl';

    /**
     * Credentials for an IBM Streaming Analytics service.
     */
    export const STREAMING_ANALYTICS_CREDENTIALS = 'streamingAnalyticsCredentials';

    /**
     * Paths to directories, comma or semicolon separated, containing IBM Streams toolkits.
     */
    export const TOOLKITS_PATH = 'toolkitsPath';

    /**
     * Traces the communication between VS Code and the SPL language server.
     */
    export const TRACE_SERVER = 'trace.server';
}
