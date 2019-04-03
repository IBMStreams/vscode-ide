import { Constants } from '../utils';

export namespace Commands {
    export const ID = Constants.EXTENSION_NAME;

    /**
     * Create an IBM Streams Application from Template
     */
    export const CREATE_APPLICATION = `${ID}.createApplication`;

    /**
     * Open IBM Cloud Dashboard
     */
    export const OPEN_CLOUD_DASHBOARD = `${ID}.openCloudDashboard`;

    /**
     * Open IBM Cloud Private for Data Dashboard
     */
    export const OPEN_ICP4D_DASHBOARD = `${ID}.openIcp4dDashboard`;

    /**
     * Open IBM Streaming Analytics Console
     */
    export const OPEN_STREAMING_ANALYTICS_CONSOLE = `${ID}.openStreamingAnalyticsConsole`;

    /**
     * Open IBM Streams Console
     */
    export const OPEN_STREAMS_CONSOLE = `${ID}.openStreamsConsole`;

    /**
     * Refresh IBM Streams toolkits
     */
    export const REFRESH_TOOLKITS = `${ID}.refreshToolkits`;

    /**
     * Remove Build Output Channels
     */
    export const REMOVE_OUTPUT_CHANNELS = `${ID}.removeOutputChannels`;

    /**
     * Set IBM Cloud Private for Data URL
     */
    export const SET_ICP4D_URL = `${ID}.setIcp4dUrl`;

    /**
     * Set IBM Streaming Analytics Service Credentials
     */
    export const SET_SERVICE_CREDENTIALS = `${ID}.setServiceCredentials`;

    /**
     * Set IBM Streams Target Version
     */
    export const SET_TARGET_VERSION = `${ID}.setTargetVersion`;

    /**
     * Set IBM Streams Toolkits Path
     */
    export const SET_TOOLKITS_PATH = `${ID}.setToolkitsPath`;

    /**
     * Build
     */
    export const BUILD_APP_DOWNLOAD = `${ID}.buildAppDownload`;

    /**
     * Build and Submit Job
     */
    export const BUILD_APP_SUBMIT = `${ID}.buildAppSubmit`;

    /**
     * Build
     */
    export const BUILD_MAKE_DOWNLOAD = `${ID}.buildMakeDownload`;

    /**
     * Build and Submit Job(s)
     */
    export const BUILD_MAKE_SUBMIT = `${ID}.buildMakeSubmit`;

    /**
     * Submit Job
     */
    export const SUBMIT = `${ID}.submit`;

    /**
     * Show ICP4D Settings Webview Panel
     */
    export const SHOW_ICP4D_SETTINGS_WEBVIEW_PANEL = `${ID}.showICP4DSettingsWebviewPanel`;
}
