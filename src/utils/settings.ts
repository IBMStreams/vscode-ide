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
 * Values for the `logLevel` setting
 */
export const LOG_LEVEL_VALUE = {
  OFF: 'off',
  DEBUG: 'debug'
};

/**
 * Default value for the `logLevel` setting
 */
export const LOG_LEVEL_DEFAULT = LOG_LEVEL_VALUE.OFF;

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
