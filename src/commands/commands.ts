'use strict';

export namespace Commands {
    export const ID = 'ibm-streams';

    /**
     * Set IBM Streaming Analytics Service Credentials
     */
    export const SET_SERVICE_CREDENTIALS = `${ID}.setServiceCredentials`;

    /**
     * Set IBM Streams Toolkits Path
     */
    export const SET_TOOLKITS_PATH = `${ID}.setToolkitsPath`;

    /**
     * Build
     */
    export const BUILD_DOWNLOAD = `${ID}.buildDownload`;

    /**
     * Build and Submit Job
     */
    export const BUILD_SUBMIT = `${ID}.buildSubmit`;

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
     * Create an IBM Streams Application from Template
     */
    export const CREATE_APPLICATION = `${ID}.createApplication`;

    /**
     * Open IBM Streaming Analytics Console
     */
    export const OPEN_STREAMING_ANALYTICS_CONSOLE = `${ID}.openStreamingAnalyticsConsole`;

    /**
     * Open IBM Cloud Dashboard
     */
    export const OPEN_CLOUD_DASHBOARD = `${ID}.openCloudDashboard`;

    /**
     * Remove Build Output Channels
     */
    export const REMOVE_OUTPUT_CHANNELS = `${ID}.removeOutputChannels`;
}
