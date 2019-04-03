export namespace Settings {
    /**
     * IBM Cloud Private for Data URL.
     */
    export const ICP4D_URL = 'icp4dUrl';

    /**
     * Credentials for an IBM Streaming Analytics service.
     */
    export const STREAMING_ANALYTICS_CREDENTIALS = 'streamingAnalyticsCredentials';

    /**
     * Streams version to target for application builds and submissions.
     */
    export const TARGET_VERSION = 'targetVersion';

    /**
     * Options for Streams version to target for application builds and submissions.
     */
    export const enum TARGET_VERSION_OPTION {
        V4 = 'IBM Cloud: Streaming Analytics service',
        V5 = 'IBM Cloud Private for Data: Streams add-on instance'
    }

    /**
     * Paths to directories, comma or semicolon separated, containing IBM Streams toolkits.
     */
    export const TOOLKITS_PATH = 'toolkitsPath';

    /**
     * Use the host specified in the IBM Cloud Private for Data URL for builds.
     */
    export const USE_ICP4D_MASTER_NODE_HOST = 'useIcp4dMasterNodeHost';

    /**
     * Traces the communication between VS Code and the SPL language server.
     */
    export const TRACE_SERVER = 'trace.server';
}
