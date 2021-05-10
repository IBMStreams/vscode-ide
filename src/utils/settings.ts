import { LogLevel } from '@ibmstreams/common';

/**
 * Interval in minutes at which an IBM Streams instance is automatically refreshed
 */
export const ENV_REFRESH_INTERVAL = 'ibm-streams.environment.refreshInterval';

/**
 * Default value for the `refreshInterval` setting
 */
export const ENV_REFRESH_INTERVAL_DEFAULT = 5;

/**
 * Timeout in seconds before a request times out
 */
export const ENV_TIMEOUT_FOR_REQUESTS =
  'ibm-streams.environment.timeoutForRequests';

/**
 * Default value for the `timeoutForRequests` setting
 */
export const ENV_TIMEOUT_FOR_REQUESTS_DEFAULT = 60;

/**
 * Paths to directories, comma or semicolon separated, containing additional IBM Streams toolkits
 */
export const ENV_TOOLKIT_PATHS = 'ibm-streams.environment.toolkitPaths';

/**
 * Default value for the `toolkitPaths` setting
 */
export const ENV_TOOLKIT_PATHS_DEFAULT = '/path/to/toolkits/directory';

/**
 * Log level for the extension
 */
export const LOG_LEVEL = 'ibm-streams.logLevel';

/**
 * Default value for the `logLevel` setting
 */
export const LOG_LEVEL_DEFAULT = LogLevel.Info;

/**
 * Controls how the SPL language server runs
 */
export const SERVER_MODE = 'ibm-streams.server.mode';

/**
 * Values for the `server.mode` setting
 */
export const SERVER_MODE_VALUE = {
  EMBEDDED: 'embedded',
  SOCKET: 'socket'
};

/**
 * Default value for the `server.mode` setting
 */
export const SERVER_MODE_DEFAULT = SERVER_MODE_VALUE.EMBEDDED;

/**
 * The port where the SPL language server runs when `server.mode` is `socket`
 */
export const SERVER_PORT = 'ibm-streams.server.port';

/**
 * Default value for the `server.port` setting
 */
export const SERVER_PORT_DEFAULT = 5007;

/**
 * Traces the communication between VS Code and the SPL language server
 */
export const TRACE_SERVER = 'ibm-streams.trace.server';

/**
 * Values for the `trace.server` setting
 */
export const TRACE_SERVER_VALUE = {
  OFF: 'off',
  VERBOSE: 'verbose'
};

/**
 * Default value for the `trace.server` setting
 */
export const TRACE_SERVER_DEFAULT = TRACE_SERVER_VALUE.OFF;

/**
 * The option to enamble v4.3 builds`
 */
export const OSSTREAMS_BUILD = 'ibm-streams.environment.enableOSStreamsBuilds';

/**
 * Default value for the enable v4 build setting
 */
export const OSSTREAMS_BUILD_DEFAULT = false;

/**
 * The input value for OSStreams`
 */
export const OSS_INPUT = 'ibm-streams.environment.OSStreamsImageLocation';

/**
 * Default value for the OSS input
 */
export const OSS_INPUT_DEFAULT = 'localhost:5000/$USER/streams-runtime:6.debug';

/**
 * The option to enamble v4.3 builds`
 */
export const V43_BUILD = 'ibm-streams.environment.enableV43Builds';

/**
 * Default value for the enable v4 build setting
 */
export const V43_BUILD_DEFAULT = false;

/**
 * The image name for a v4.3 build
 */
export const V43_IMAGE_NAME = 'ibm-streams.environment.V43Imagename';

/**
 * Default value for the `V43Imagename` setting
 */
export const V43_IMAGE_NAME_DEFAULT = '';

/**
 * The shared folder for v43 builds
 */
export const V43_SHARED_FOLDER = 'ibm-streams.environment.sharedWorkspace';

/**
 * Default value for the `V43SharedFolder` setting
 */
export const V43_SHARED_FOLDER_DEFAULT = '';

/**
 * The V43 version
 */
export const V43_VERSION = 'ibm-streams.environment.QSEVersion';

/**
 * Default value for the `V43Version` setting
 */
export const V43_VERSION_DEFAULT = '';
