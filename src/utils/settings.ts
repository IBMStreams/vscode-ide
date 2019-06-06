/**
 * Section identifiers
 */
export const SECTION_ID = 'ibm-streams';

/**
 * IBM Cloud Pak for Data URL
 */
export const ICP4D_URL = 'ibm-streams.icp4d.url';

/**
 * Use the host specified in the IBM Cloud Pak for Data URL for builds
 */
export const ICP4D_USE_MASTER_NODE_HOST = 'ibm-streams.icp4d.useMasterNodeHost';

/**
 * Number of seconds before a request times out
 */
export const REQUEST_TIMEOUT = 'ibm-streams.requestTimeout';

/**
 * Credentials for an IBM Streaming Analytics service
 */
export const STREAMING_ANALYTICS_CREDENTIALS = 'ibm-streams.streamingAnalytics.credentials';

/**
 * Streams version to target for application builds and submissions
 */
export const TARGET_VERSION = 'ibm-streams.targetVersion';

/**
 * Options for Streams version to target for application builds and submissions
 */
export enum TARGET_VERSION_OPTION {
    V4 = 'IBM Cloud: Streaming Analytics service',
    V5 = 'IBM Cloud Pak for Data: Streams add-on'
}

/**
 * Paths to directories, comma or semicolon separated, containing IBM Streams toolkits
 */
export const TOOLKIT_PATHS = 'ibm-streams.toolkitPaths';

/**
 * Default value for the toolkitPaths setting
 */
export const TOOLKIT_PATHS_DEFAULT = '/path/to/toolkits/directory';

/**
 * Traces the communication between VS Code and the SPL language server
 */
export const TRACE_SERVER = 'ibm-streams.trace.server';

/**
 * Default value for the trace.server setting
 */
export const TRACE_SERVER_DEFAULT = 'off';
