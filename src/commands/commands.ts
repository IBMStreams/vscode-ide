/**
 * General commands
 */
export const GENERAL = {
  /**
   * Add SPL Application
   */
  ADD_SPL_APPLICATION: 'ibm-streams.addSplApplication',
  /**
   * Build SPL Applications
   */
  BUILD_SPL_APPLICATIONS: 'ibm-streams.buildSplApplications',
  /**
   * Build and Submit SPL Applications
   */
  BUILD_SUBMIT_SPL_APPLICATIONS: 'ibm-streams.buildSubmitSplApplications',
  /**
   * Create SPL Application
   */
  CREATE_SPL_APPLICATION: 'ibm-streams.createSplApplication',
  /**
   * Create SPL Application Set
   */
  CREATE_SPL_APPLICATION_SET: 'ibm-streams.createSplApplicationSet',
  /**
   * Create C++ Primitive Operator
   */
  CREATE_CPP_PRIMITIVE_OPERATOR: 'ibm-streams.createCppPrimitiveOperator',
  /**
   * Create Java Primitive Operator
   */
  CREATE_JAVA_PRIMITIVE_OPERATOR: 'ibm-streams.createJavaPrimitiveOperator',
  /**
   * Remove Build Output Channels
   */
  REMOVE_OUTPUT_CHANNELS: 'ibm-streams.removeOutputChannels',
  /**
   * Show SPL Application Webview Panel (internal)
   */
  SHOW_SPL_APPLICATION_WEBVIEW_PANEL:
    'ibm-streams.showCreateSplApplicationPanel',
  /**
   * Show SPL Application Set Webview Panel (internal)
   */
  SHOW_SPL_APPLICATION_SET_WEBVIEW_PANEL:
    'ibm-streams.showCreateSplApplicationSetPanel',
  /**
   * Show Create Primitive Operator Webview Panel (internal)
   */
  SHOW_PRIMITIVE_OPERATOR_WEBVIEW_PANEL:
    'ibm-streams.showCreatePrimitiveOperatorPanel'
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
   * Build using V4.3
   */
  V43_BUILD: 'ibm-streams.build.v43Build',
  /**
   * Build using OSStreams
   */
  OSSTREAMS_BUILD: 'ibm-streams.build.OSStreamsBuild',
  /**
   * Build Edge Application Image
   */
  APP_IMAGE: 'ibm-streams.build.appEdgeAnalyticsImage',
  /**
   * Build
   */
  MAKE_DOWNLOAD: 'ibm-streams.build.makeDownload',
  /**
   * Build and Submit Job(s)
   */
  MAKE_SUBMIT: 'ibm-streams.build.makeSubmit',
  /**
   * Build Edge Application Image
   */
  MAKE_IMAGE: 'ibm-streams.build.makeEdgeAnalyticsImage',
  /**
   * Submit Job
   */
  SUBMIT: 'ibm-streams.build.submit',
  /**
   * Upload Application Bundle
   */
  UPLOAD_APPLICATION_BUNDLE: 'ibm-streams.build.uploadApplicationBundle',
  /**
   * Build Edge Application Image
   */
  IMAGE: 'ibm-streams.build.edgeAnalyticsImage',
  /**
   * Build Toolkit
   */
  TOOLKIT: 'ibm-streams.build.toolkit',
  /**
   * Build C++ Primitive Operator
   */
  CPP_PRIMITIVE_OPERATOR: 'ibm-streams.build.cppPrimitiveOperator',
  /**
   * Build Java Primitive Operator
   */
  JAVA_PRIMITIVE_OPERATOR: 'ibm-streams.build.javaPrimitiveOperator',
  /**
   * Configure an Image Build (internal)
   */
  CONFIGURE_IMAGE_BUILD: 'ibm-streams.build.configureImageBuild',
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
  STREAMING_ANALYTICS_OPEN_CONSOLE:
    'ibm-streams.environment.streamingAnalytics.openConsole',
  /**
   * Open IBM Cloud Dashboard
   */
  STREAMING_ANALYTICS_OPEN_DASHBOARD:
    'ibm-streams.environment.streamingAnalytics.openDashboard',
  /**
   * Open IBM Streams Console
   */
  STREAMS_STANDALONE_OPEN_CONSOLE:
    'ibm-streams.environment.streamsStandalone.openConsole',
  /**
   * Show Streams Authentication Webview Panel (internal)
   */
  SHOW_AUTHENTICATION_WEBVIEW_PANEL: 'ibm-streams.environment.showAuthPanel',
  /**
   * Show Cloud Pak for Data Application Service Webview Panel (internal)
   */
  SHOW_CPD_APP_SERVICE_PANEL: 'ibm-streams.environment.showCpdAppServicePanel',
  /**
   * Show Cloud Pak for Data Job Webview Panel (internal)
   */
  SHOW_CPD_JOB_PANEL: 'ibm-streams.environment.showCpdJobPanel',
  /**
   * Show Streams Instance Selection Webview Panel (internal)
   */
  SHOW_INSTANCE_WEBVIEW_PANEL: 'ibm-streams.environment.showInstancePanel',
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
  TOOLKITS_REFRESH: 'ibm-streams.environment.toolkits.refresh',
  /**
   * Add Toolkit to Streams Build Service
   */
  ADD_TOOLKIT_TO_BUILD_SERVICE:
    'ibm-streams.environment.addToolkitToBuildService',
  /**
   * Remove Toolkits from Streams Build Service
   */
  REMOVE_TOOLKITS_FROM_BUILD_SERVICE:
    'ibm-streams.environment.removeToolkitsFromBuildService',
  /**
   * Cancel multiple active jobs
   */
  CANCEL_RUNNING_JOBS: 'ibm-streams.environment.cancelRunningJobs',
  /**
   * Delete multiple canceled jobs
   */
  DELETE_CANCELED_JOBS: 'ibm-streams.environment.deleteCanceledJobs'
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
        ADD_INSTANCE:
          'ibm-streams.view.streamsExplorer.streamsInstances.addInstance',
        /**
         * Remove Instances
         */
        REMOVE_INSTANCES:
          'ibm-streams.view.streamsExplorer.streamsInstances.removeInstances',
        /**
         * Refresh Instances
         */
        REFRESH_INSTANCES:
          'ibm-streams.view.streamsExplorer.streamsInstances.refreshInstances'
      },
      INSTANCE: {
        /**
         * Authenticate
         */
        AUTHENTICATE:
          'ibm-streams.view.streamsExplorer.streamsInstances.instance.authenticate',
        /**
         * Submit Job
         */
        SUBMIT_JOB:
          'ibm-streams.view.streamsExplorer.streamsInstances.instance.submitJob',
        /**
         * Open Cloud Pak for Data Instance Details
         */
        OPEN_CPD_DETAILS:
          'ibm-streams.view.streamsExplorer.streamsInstances.instance.openCpdDetails',
        /**
         * Open Streams Console
         */
        OPEN_CONSOLE:
          'ibm-streams.view.streamsExplorer.streamsInstances.instance.openConsole',
        /**
         * Set Instance as Default
         */
        SET_DEFAULT:
          'ibm-streams.view.streamsExplorer.streamsInstances.instance.setDefault',
        /**
         * Remove Instance
         */
        REMOVE:
          'ibm-streams.view.streamsExplorer.streamsInstances.instance.remove',
        /**
         * Refresh Instance
         */
        REFRESH:
          'ibm-streams.view.streamsExplorer.streamsInstances.instance.refresh'
      },
      CPD_SPACE: {
        /**
         * Open Cloud Pak for Data Deployment Space Details
         */
        OPEN_CPD_DETAILS:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdSpace.openCpdDetails'
      },
      CPD_PROJECT: {
        /**
         * Open Cloud Pak for Data Deployment Project Details
         */
        OPEN_CPD_DETAILS:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdProject.openCpdDetails'
      },
      JOB: {
        /**
         * Open Cloud Pak for Data Job Details
         */
        OPEN_CPD_DETAILS:
          'ibm-streams.view.streamsExplorer.streamsInstances.job.openCpdDetails',
        /**
         * Open IBM Cloud Pak for Data Project
         */
        OPEN_CPD_PROJECT:
          'ibm-streams.view.streamsExplorer.streamsInstances.job.openCpdProject',
        /**
         * Download Job Logs
         */
        DOWNLOAD_LOGS:
          'ibm-streams.view.streamsExplorer.streamsInstances.job.downloadLogs',
        /**
         * Cancel Job
         */
        CANCEL_JOB:
          'ibm-streams.view.streamsExplorer.streamsInstances.job.cancel'
      },
      CPD_JOB: {
        /**
         * Open Cloud Pak for Data Job Definition Details
         */
        OPEN_CPD_DETAILS:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJob.openCpdDetails',
        /**
         * Edit Job
         */
        EDIT_JOB:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJob.edit',
        /**
         * Delete Job
         */
        DELETE_JOB:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJob.delete',
        /**
         * Start Job Run
         */
        START_JOB_RUN:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJob.startRun'
      },
      CPD_JOB_RUN: {
        /**
         * Open Cloud Pak for Data Job Run Details
         */
        OPEN_CPD_DETAILS:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJobRun.openCpdDetails',
        /**
         * Create Log Snapshot
         */
        CREATE_LOG_SNAPSHOT:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJobRun.createLogSnapshot',
        /**
         * Cancel Job Run
         */
        CANCEL:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJobRun.cancel',
        /**
         * Delete Job Run
         */
        DELETE:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJobRun.delete'
      },
      CPD_JOB_RUN_LOG: {
        /**
         * Delete Job Run Logs
         */
        DELETE_MULTIPLE:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJobRunLog.deleteMultiple',
        /**
         * Delete Job Run Log
         */
        DELETE:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJobRunLog.delete',
        /**
         * Download Job Run Log
         */
        DOWNLOAD:
          'ibm-streams.view.streamsExplorer.streamsInstances.cpdJobRunLog.download'
      },
      BASE_IMAGE: {
        /**
         * Build Edge Application Image
         */
        BUILD_IMAGE:
          'ibm-streams.view.streamsExplorer.streamsInstances.baseImage.buildImage',
        /**
         * Copy ID
         */
        COPY_ID:
          'ibm-streams.view.streamsExplorer.streamsInstances.baseImage.copyId'
      }
    },
    STREAMS_APP_SERVICES: {
      /**
       * Open REST API documentation
       */
      OPEN_REST_API_DOC:
        'ibm-streams.view.streamsExplorer.streamsAppServices.service.openRestApiDoc',
      /**
       * Send Data
       */
      SEND_DATA:
        'ibm-streams.view.streamsExplorer.streamsAppServices.endpointPath.sendData',
      /**
       * Receive Data
       */
      RECEIVE_DATA:
        'ibm-streams.view.streamsExplorer.streamsAppServices.endpointPath.receiveData'
    },
    STREAMS_JOBS: {
      /**
       * Open Cloud Pak for Data Deployment Space Details
       */
      OPEN_CPD_DETAILS:
        'ibm-streams.view.streamsExplorer.streamsJobs.openCpdDetails',
      /**
       * Create Log Snapshot
       */
      CREATE_LOG_SNAPSHOT:
        'ibm-streams.view.streamsExplorer.streamsJobs.createLogSnapshot',
      /**
       * Cancel Job Run
       */
      CANCEL: 'ibm-streams.view.streamsExplorer.streamsJobs.cancel'
    },
    STREAMS_DETAILS: {
      /**
       * Copy to Clipboard
       */
      COPY_TO_CLIPBOARD:
        'ibm-streams.view.streamsExplorer.streamsDetails.copyToClipboard'
    },
    STREAMS_TOOLKITS: {
      /**
       * Refresh Toolkits
       */
      REFRESH_TOOLKITS:
        'ibm-streams.view.streamsExplorer.streamsToolkits.refresh',
      /**
       * Edit Local Toolkits
       */
      EDIT_LOCAL_TOOLKITS:
        'ibm-streams.view.streamsExplorer.streamsToolkits.editLocalToolkits',
      /**
       * Add Toolkit Path
       */
      ADD_TOOLKIT_PATH:
        'ibm-streams.view.streamsExplorer.streamsToolkits.addToolkitPath',
      /**
       * Remove Toolkit Paths
       */
      REMOVE_TOOLKIT_PATHS:
        'ibm-streams.view.streamsExplorer.streamsToolkits.removeToolkitPaths',
      /**
       * Open Toolkit
       */
      OPEN_TOOLKIT:
        'ibm-streams.view.streamsExplorer.streamsToolkits.openToolkit',
      /**
       * View Toolkit
       */
      VIEW_TOOLKIT:
        'ibm-streams.view.streamsExplorer.streamsToolkits.viewToolkit'
    }
  }
};
