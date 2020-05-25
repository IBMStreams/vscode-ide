/**
 * General commands
 */
export const GENERAL = {
    /**
     * Create an IBM Streams Application from Template
     */
    CREATE_APPLICATION: 'ibm-streams.createApplication',
    /**
     * Remove Build Output Channels
     */
    REMOVE_OUTPUT_CHANNELS: 'ibm-streams.removeOutputChannels'
};

/**
 * Build-specific commands
 */
export const BUILD = {
    /**
     * Build
     */
    APP_DOWNLOAD: 'ibm-streams.build.appDownload',
    /**
     * Build and Submit Job
     */
    APP_SUBMIT: 'ibm-streams.build.appSubmit',
    /**
     * Build
     */
    MAKE_DOWNLOAD: 'ibm-streams.build.makeDownload',
    /**
     * Build and Submit Job(s)
     */
    MAKE_SUBMIT: 'ibm-streams.build.makeSubmit',
    /**
     * Submit Job
     */
    SUBMIT: 'ibm-streams.build.submit',
    /**
     * Configure a Job Submission (internal)
     */
    CONFIGURE_JOB_SUBMISSION: 'ibm-streams.build.configureJobSubmission'
};

/**
 * Streams environment-specific commands
 */
export const ENVIRONMENT = {
    /**
     * Open IBM Streams Console
     */
    CPD_OPEN_CONSOLE: 'ibm-streams.environment.cloudPakForData.openConsole',
    /**
     * Open IBM Cloud Pak for Data Dashboard
     */
    CPD_OPEN_DASHBOARD: 'ibm-streams.environment.cloudPakForData.openDashboard',
    /**
     * Open IBM Streaming Analytics Console
     */
    STREAMING_ANALYTICS_OPEN_CONSOLE: 'ibm-streams.environment.streamingAnalytics.openConsole',
    /**
     * Open IBM Cloud Dashboard
     */
    STREAMING_ANALYTICS_OPEN_DASHBOARD: 'ibm-streams.environment.streamingAnalytics.openDashboard',
    /**
     * Open IBM Streams Console
     */
    STREAMS_STANDALONE_OPEN_CONSOLE: 'ibm-streams.environment.streamsStandalone.openConsole',
    /**
     * Show Streams Authentication Webview Panel (internal)
     */
    SHOW_AUTHENTICATION_WEBVIEW_PANEL: 'ibm-streams.environment.showAuthWebviewPanel',
    /**
     * Show Streams Instance Selection Webview Panel (internal)
     */
    SHOW_INSTANCE_WEBVIEW_PANEL: 'ibm-streams.environment.showInstanceWebviewPanel',
    /**
     * Show Job Graph
     */
    SHOW_JOB_GRAPH: 'ibm-streams.environment.showJobGraph',
    /**
     * Set IBM Streams Toolkit Paths
     */
    TOOLKIT_PATHS_SET: 'ibm-streams.environment.setToolkitPaths',
    /**
     * List Available IBM Streams Toolkits
     */
    TOOLKITS_LIST: 'ibm-streams.environment.toolkits.list',
    /**
     * Refresh IBM Streams Toolkits
     */
    TOOLKITS_REFRESH: 'ibm-streams.environment.toolkits.refresh'
};

/**
 * Tree view commands
 */
export const VIEW = {
    STREAMS_EXPLORER: {
        STREAMS_INSTANCES: {
            GENERAL: {
                /**
                 * Add Instance
                 */
                ADD_INSTANCE: 'ibm-streams.view.streamsExplorer.streamsInstances.addInstance',
                /**
                 * Remove Instances
                 */
                REMOVE_INSTANCES: 'ibm-streams.view.streamsExplorer.streamsInstances.removeInstances',
                /**
                 * Refresh Instances
                 */
                REFRESH_INSTANCES: 'ibm-streams.view.streamsExplorer.streamsInstances.refreshInstances'
            },
            INSTANCE: {
                /**
                 * Authenticate
                 */
                AUTHENTICATE: 'ibm-streams.view.streamsExplorer.streamsInstances.instance.authenticate',
                /**
                 * Open Cloud Pak for Data Instance Details
                 */
                OPEN_CPD_DETAILS: 'ibm-streams.view.streamsExplorer.streamsInstances.instance.openCpdDetails',
                /**
                 * Open Streams Console
                 */
                OPEN_CONSOLE: 'ibm-streams.view.streamsExplorer.streamsInstances.instance.openConsole',
                /**
                 * Set Instance as Default
                 */
                SET_DEFAULT: 'ibm-streams.view.streamsExplorer.streamsInstances.instance.setDefault',
                /**
                 * Remove Instance
                 */
                REMOVE: 'ibm-streams.view.streamsExplorer.streamsInstances.instance.remove',
                /**
                 * Refresh Instance
                 */
                REFRESH: 'ibm-streams.view.streamsExplorer.streamsInstances.instance.refresh'
            },
            JOB: {
                /**
                 * Open Cloud Pak for Data Job Details
                 */
                OPEN_CPD_DETAILS: 'ibm-streams.view.streamsExplorer.streamsInstances.job.openCpdDetails',
                /**
                 * Open IBM Cloud Pak for Data Project
                 */
                OPEN_CPD_PROJECT: 'ibm-streams.view.streamsExplorer.streamsInstances.job.openCpdProject',
                /**
                 * Download Job Logs
                 */
                DOWNLOAD_LOGS: 'ibm-streams.view.streamsExplorer.streamsInstances.job.downloadLogs',
                /**
                 * Cancel Job
                 */
                CANCEL_JOB: 'ibm-streams.view.streamsExplorer.streamsInstances.job.cancel'
            }
        },
        STREAMS_DETAILS: {
            /**
             * Show Details for Item (internal)
             */
            SHOW_DETAILS_FOR_ITEM: 'ibm-streams.view.streamsExplorer.streamsDetails.showDetailsForItem',
            /**
             * Copy to Clipboard
             */
            COPY_TO_CLIPBOARD: 'ibm-streams.view.streamsExplorer.streamsDetails.copyToClipboard'
        },
        STREAMS_TOOLKITS: {
            /**
             * Refresh Toolkits
             */
            REFRESH_TOOLKITS: 'ibm-streams.view.streamsExplorer.streamsToolkits.refresh',
            /**
             * Edit Local Toolkits
             */
            EDIT_LOCAL_TOOLKITS: 'ibm-streams.view.streamsExplorer.streamsToolkits.editLocalToolkits'
        }
    }
};
