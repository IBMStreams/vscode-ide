import {
  CloudPakForDataJobType,
  InstanceSelector,
  store,
  StreamsInstanceType
} from '@ibmstreams/common';
import _cloneDeep from 'lodash/cloneDeep';
import { commands, ExtensionContext, window } from 'vscode';
import { Commands } from '../../../commands';
import { Streams } from '../../../streams';
import { Views, VSCode } from '../../../utils';
import {
  BaseImageTreeItem,
  BuildPoolTreeItem,
  CpdJobRunTreeItem,
  CpdJobRunLogTreeItem,
  CpdJobTreeItem,
  CpdProjectTreeItem,
  CpdSpaceTreeItem,
  InstanceTreeItem,
  JobTreeItem,
  LabelTreeItem,
  StreamsTreeItem,
  TreeItemType
} from '../instancesView/treeItems';
import { DetailsProvider, DetailTreeItem } from './provider';

interface DetailItem {
  label: string;
  value: string;
}

const getTimeUnitLabel = (
  unit: number,
  label: string,
  isLast = false
): string =>
  unit ? `${unit} ${label}${unit === 1 ? '' : 's'}${isLast ? '' : ', '}` : '';

const instanceProperties = {
  v5: [
    {
      name: 'applicationConfigurations',
      label: 'Application configurations',
      isUrl: true
    },
    {
      name: 'applicationEnvironmentVariables',
      label: 'Application environment variables',
      isUrl: true
    },
    { name: 'bearerToken', label: 'Bearer token' },
    {
      name: 'connectionDetails',
      label: 'Connection details',
      mapFn: (detail: any): DetailItem => ({
        label: detail.label,
        value: detail.value
      })
    },
    {
      name: 'applicationResourceTags',
      label: 'Application resource tags',
      mapFn: (tag: any): DetailItem => ({ label: tag, value: null })
    },
    { name: 'exportedStreams', label: 'Exported streams', isUrl: true },
    { name: 'groups', label: 'Groups', isUrl: true },
    { name: 'health', label: 'Health' },
    { name: 'id', label: 'ID' },
    { name: 'importedStreams', label: 'Imported streams', isUrl: true },
    { name: 'jobGroups', label: 'Job groups', isUrl: true },
    { name: 'jobMetricMetadata', label: 'Job metric metadata', isUrl: true },
    { name: 'jobs', label: 'Jobs', isUrl: true },
    { name: 'jobsMetricsSnapshot', label: 'Job metrics snapshot', isUrl: true },
    {
      name: 'jobsNotificationsSnapshot',
      label: 'Jobs notifications snapshot',
      isUrl: true
    },
    { name: 'jobsSnapshot', label: 'Jobs snapshot', isUrl: true },
    { name: 'nameServiceEntries', label: 'Name service entries', isUrl: true },
    { name: 'notifications', label: 'Notifications', isUrl: true },
    { name: 'operatorConnections', label: 'Operator connections', isUrl: true },
    { name: 'operators', label: 'Operators', isUrl: true },
    { name: 'peConnections', label: 'PE connections', isUrl: true },
    { name: 'pes', label: 'PEs', isUrl: true },
    { name: 'productLog', label: 'Product log', isUrl: true },
    { name: 'productLogTrace', label: 'Product log trace', isUrl: true },
    { name: 'productVersion', label: 'Product version' },
    { name: 'properties', label: 'Properties', isUrl: true },
    { name: 'resources', label: 'Resources', isUrl: true },
    { name: 'roles', label: 'Roles', isUrl: true },
    {
      name: 'restrictedConfigurations',
      label: 'Restricted configurations',
      isUrl: true
    },
    { name: 'securedObjects', label: 'Secured objects', isUrl: true },
    {
      name: 'services',
      label: 'Services',
      mapFn: (service: any): DetailItem => {
        const detail = {
          label: service.name,
          value: service.status,
          ...(service.leader && {
            children: [{ label: 'leader', value: service.leader }]
          })
        };
        return detail;
      }
    },
    { name: 'serviceToken', label: 'Service token' },
    {
      name: 'startTime',
      label: 'Start time',
      formatFn: (time: number): string => new Date(time).toLocaleString()
    },
    { name: 'status', label: 'Status' },
    { name: 'trustedOrigins', label: 'Trusted origins', isUrl: true },
    { name: 'users', label: 'Users', isUrl: true },
    { name: 'views', label: 'Views', isUrl: true },
    { name: 'zooKeeperEnsemble', label: 'ZooKeeper ensemble', isUrl: true }
  ],
  v4: [
    { name: 'activeServices', label: 'Active services', isUrl: true },
    {
      name: 'activeVersion',
      label: 'Active version',
      childProperties: [
        { name: 'architecture', label: 'Architecture' },
        { name: 'fullProductVersion', label: 'Full product version' },
        { name: 'minimumOSVersion', label: 'Minimum OS version' },
        { name: 'productName', label: 'Product name' },
        { name: 'productVersion', label: 'Product version' }
      ]
    },
    { name: 'activeViews', label: 'Active views', isUrl: true },
    { name: 'configuredViews', label: 'Configured views', isUrl: true },
    {
      name: 'connectionDetails',
      label: 'Connection details',
      mapFn: (detail: any): DetailItem => ({
        label: detail.label,
        value: detail.value
      })
    },
    {
      name: 'creationTime',
      label: 'Creation time',
      formatFn: (time: number): string => new Date(time).toLocaleString()
    },
    { name: 'creationUser', label: 'Creation user' },
    { name: 'domain', label: 'Domain', isUrl: true },
    { name: 'exportedStreams', label: 'Exported streams', isUrl: true },
    { name: 'health', label: 'Health' },
    { name: 'hosts', label: 'Hosts', isUrl: true },
    { name: 'id', label: 'ID' },
    { name: 'importedStreams', label: 'Imported streams', isUrl: true },
    { name: 'jobs', label: 'Jobs', isUrl: true },
    {
      name: 'jobsMetricsSnapshot',
      label: 'Jobs metrics snapshot',
      isUrl: true
    },
    { name: 'jobsSnapshot', label: 'Jobs snapshot', isUrl: true },
    { name: 'operatorConnections', label: 'Operator connections', isUrl: true },
    { name: 'operators', label: 'Operators', isUrl: true },
    { name: 'owner', label: 'Owner' },
    { name: 'peConnections', label: 'PE connections', isUrl: true },
    { name: 'pes', label: 'PEs', isUrl: true },
    { name: 'resourceAllocations', label: 'Resource allocations', isUrl: true },
    {
      name: 'restrictedTags',
      label: 'Restricted tags',
      mapFn: (tag: any): DetailItem => ({ label: tag, value: null })
    },
    {
      name: 'startTime',
      label: 'Start time',
      formatFn: (time: number): string => new Date(time).toLocaleString()
    },
    { name: 'startedBy', label: 'Started by' },
    { name: 'status', label: 'Status' },
    { name: 'views', label: 'Views', isUrl: true }
  ]
};

const jobProperties = [
  { name: 'adlFile', label: 'ADL file' },
  { name: 'applicationLogTrace', label: 'Application log trace', isUrl: true },
  { name: 'applicationName', label: 'Application name' },
  { name: 'applicationPath', label: 'Application path' },
  { name: 'applicationScope', label: 'Application scope' },
  { name: 'applicationVersion', label: 'Application version' },
  { name: 'checkpointPath', label: 'Checkpoint path' },
  { name: 'dataPath', label: 'Data path' },
  { name: 'dynamicThreadingElastic', label: 'Dynamic threading elastic' },
  {
    name: 'dynamicThreadingThreadCount',
    label: 'Dynamic threading thread count'
  },
  { name: 'generationId', label: 'Generation ID' },
  { name: 'health', label: 'Health' },
  { name: 'id', label: 'ID' },
  { name: 'instance', label: 'Instance', isUrl: true },
  { name: 'jobGroup', label: 'Job group', isUrl: true },
  { name: 'metricsSnapshot', label: 'Metrics snapshot', isUrl: true },
  { name: 'name', label: 'Name' },
  { name: 'notifications', label: 'Notifications', isUrl: true },
  {
    name: 'notificationsSnapshot',
    label: 'Notifications snapshot',
    isUrl: true
  },
  { name: 'operatorConnections', label: 'Operator connections', isUrl: true },
  { name: 'operators', label: 'Operators', isUrl: true },
  { name: 'outputPath', label: 'Output path' },
  { name: 'peConnections', label: 'PE connections', isUrl: true },
  { name: 'persistentPaths', label: 'Persistent paths', isUrl: true },
  { name: 'pes', label: 'PEs', isUrl: true },
  { name: 'productLog', label: 'Product log', isUrl: true },
  { name: 'productVersion', label: 'Product version' },
  { name: 'resources', label: 'Resources', isUrl: true },
  { name: 'snapshot', label: 'Snapshot', isUrl: true },
  { name: 'startedBy', label: 'Started by' },
  { name: 'status', label: 'Status' },
  {
    name: 'submitParameters',
    label: 'Submit parameters',
    mapFn: (parameter: any): DetailItem => ({
      label: parameter.name,
      value: parameter.value
    })
  },
  {
    name: 'submitTime',
    label: 'Submit time',
    formatFn: (time: number): string => new Date(time).toLocaleString()
  },
  { name: 'threadingModel', label: 'Threading model' },
  { name: 'topologyUpdating', label: 'Topology updating' },
  { name: 'views', label: 'Views', isUrl: true }
];

const cpdSpaceProperties = [
  {
    name: 'created_at',
    label: 'Created at',
    formatFn: (time: string): string => new Date(time).toLocaleString()
  },
  { name: 'creator_id', label: 'Creator ID' },
  { name: 'description', label: 'Description' },
  { name: 'id', label: 'ID' },
  { name: 'name', label: 'Name' },
  {
    name: 'updated_at',
    label: 'Updated at',
    formatFn: (time: string): string => new Date(time).toLocaleString()
  },
  { name: 'url', label: 'URL' }
];

const cpdProjectProperties = [
  {
    name: 'created_at',
    label: 'Created at',
    formatFn: (time: string): string => new Date(time).toLocaleString()
  },
  { name: 'creator', label: 'Creator' },
  { name: 'description', label: 'Description' },
  { name: 'generator', label: 'Generator' },
  { name: 'guid', label: 'GUID' },
  { name: 'name', label: 'Name' },
  { name: 'public', label: 'Public' },
  {
    name: 'updated_at',
    label: 'Updated at',
    formatFn: (time: string): string => new Date(time).toLocaleString()
  },
  { name: 'url', label: 'URL' }
];

const cpdJobProperties = [
  { name: 'asset_id', label: 'Asset ID' },
  { name: 'asset_ref_type', label: 'Asset reference type' },
  {
    name: 'configuration',
    label: 'Configuration',
    childProperties: [
      { name: 'application', label: 'Application', isUrl: true },
      { name: 'env_type', label: 'Environment type' },
      {
        name: 'jobConfigurationOverlay',
        label: 'Job configuration overlay',
        formatFn: (jco: any): string => JSON.stringify(jco)
      },
      { name: 'streamsInstance', label: 'Streams instance' }
    ]
  },
  { name: 'description', label: 'Description' },
  { name: 'last_run_id', label: 'Last run ID' },
  { name: 'last_run_initiator', label: 'Last run initiator' },
  { name: 'last_run_status', label: 'Last run status' },
  {
    name: 'last_run_status_timestamp',
    label: 'Last run status timestamp',
    formatFn: (time: number): string =>
      time !== 0 ? new Date(time).toLocaleString() : time.toString()
  },
  {
    name: 'last_run_time',
    label: 'Last run time',
    formatFn: (time: string): string =>
      time !== '' ? new Date(time).toLocaleString() : time
  },
  { name: 'name', label: 'Name' },
  { name: 'owner_id', label: 'Owner ID' },
  { name: 'space_name', label: 'Space name' },
  {
    name: 'sabAsset',
    label: 'Streams application',
    mapFn: (detail: any): DetailItem => ({
      label: detail.label,
      value: detail.value
    })
  },
  { name: 'version', label: 'Version' }
];

const cpdJobRunProperties = [
  { name: 'asset_id', label: 'Asset ID' },
  {
    name: 'configuration',
    label: 'Configuration',
    childProperties: [
      { name: 'application', label: 'Application', isUrl: true },
      { name: 'env_type', label: 'Environment type' },
      {
        name: 'jobConfigurationOverlay',
        label: 'Job configuration overlay',
        formatFn: (jco: any): string => JSON.stringify(jco)
      },
      { name: 'jobId', label: 'Job ID' },
      { name: 'namespace', label: 'Namespace' },
      { name: 'streamsInstance', label: 'Streams instance' }
    ]
  },
  { name: 'created', label: 'Created' },
  {
    name: 'created_at',
    label: 'Created at',
    formatFn: (time: string): string => new Date(time).toLocaleString()
  },
  {
    name: 'duration',
    label: 'Duration',
    formatFn: (duration: number): string => {
      const days = Math.floor(duration / (3600 * 24));
      const hours = Math.floor((duration % (3600 * 24)) / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = Math.floor(duration % 60);

      const daysLabel = getTimeUnitLabel(days, 'day');
      const hoursLabel = getTimeUnitLabel(hours, 'hour');
      const minutesLabel = getTimeUnitLabel(minutes, 'minute');
      const secondsLabel = getTimeUnitLabel(seconds, 'second', true);
      return daysLabel + hoursLabel + minutesLabel + secondsLabel;
    }
  },
  { name: 'description', label: 'Description' },
  { name: 'job_name', label: 'Job name' },
  { name: 'job_ref', label: 'Job reference' },
  { name: 'job_type', label: 'Job type' },
  { name: 'name', label: 'Name' },
  { name: 'owner_id', label: 'Owner ID' },
  { name: 'isScheduledRun', label: 'Scheduled run' },
  { name: 'space_name', label: 'Space name' },
  { name: 'state', label: 'State' },
  {
    name: 'streamsJob',
    label: 'Streams job',
    childProperties: jobProperties
  }
];

const cpdJobRunLogProperties = [
  {
    name: 'last_modified',
    label: 'Last modified',
    formatFn: (time: string): string => new Date(time).toLocaleString()
  },
  {
    name: 'path',
    label: 'Name',
    formatFn: (path: string): string => path.split('/').pop()
  },
  {
    name: 'size',
    label: 'Size',
    formatFn: (size: number): string => {
      if (size === 0) {
        return '0 B';
      }

      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(size) / Math.log(k));

      return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
  }
];

const buildServiceProperties = {
  buildService: [
    { name: 'buildPools', label: 'Build pools', isUrl: true },
    { name: 'builds', label: 'Builds', isUrl: true },
    { name: 'logs', label: 'Logs', isUrl: true },
    { name: 'name', label: 'Name' },
    { name: 'snapshot', label: 'Snapshot', isUrl: true },
    { name: 'status', label: 'Status' },
    { name: 'traceFileCount', label: 'Trace file count' },
    { name: 'traceFileSize', label: 'Trace file size' },
    { name: 'traceLevel', label: 'Trace level' },
    { name: 'version', label: 'Version' }
  ],
  buildPool: [
    { name: 'baseImages', label: 'Base images', isUrl: true },
    { name: 'builderImage', label: 'Builder image' },
    { name: 'buildInactivityTimeout', label: 'Build inactivity timeout' },
    { name: 'buildingCount', label: 'Building count' },
    { name: 'buildProcessingTimeout', label: 'Build processing timeout' },
    {
      name: 'buildProcessingTimeoutMaximum',
      label: 'Build processing timeout maximum'
    },
    { name: 'buildProductVersion', label: 'Build product version' },
    { name: 'builds', label: 'Builds', isUrl: true },
    { name: 'logs', label: 'Logs', isUrl: true },
    { name: 'name', label: 'Name' },
    { name: 'productInstalls', label: 'Product installs', isUrl: true },
    { name: 'pythonPackages', label: 'Python packages', isUrl: true },
    { name: 'resourceWaitTimeout', label: 'Resource wait timeout' },
    { name: 'sizeMaximum', label: 'Size maximum' },
    { name: 'sizeMinimum', label: 'Size minimum' },
    { name: 'status', label: 'Status' },
    { name: 'toolkits', label: 'Toolkits', isUrl: true },
    { name: 'traceFileCount', label: 'Trace file count' },
    { name: 'traceFileSize', label: 'Trace file size' },
    { name: 'traceLevel', label: 'Trace level' },
    { name: 'version', label: 'Version' },
    { name: 'waitingCount', label: 'Waiting count' }
  ],
  baseImage: [
    { name: 'id', label: 'ID' },
    { name: 'name', label: 'Name' },
    { name: 'prefix', label: 'Prefix' },
    { name: 'registry', label: 'Registry' },
    { name: 'tag', label: 'Tag' }
  ]
};

/**
 * Represents the Details view
 */
export default class DetailsView {
  private _treeDataProvider: DetailsProvider;

  constructor(context: ExtensionContext) {
    this._treeDataProvider = new DetailsProvider(context.extensionPath);
    window.createTreeView(Views.StreamsDetails, {
      treeDataProvider: this._treeDataProvider,
      showCollapseAll: true
    });

    const detailCommands = Commands.VIEW.STREAMS_EXPLORER.STREAMS_DETAILS;
    commands.registerCommand(
      detailCommands.SHOW_DETAILS_FOR_ITEM,
      (type: string, element: any, selectedTreeItem: StreamsTreeItem) => {
        this._showDetails(type, element, selectedTreeItem);
      }
    );
    commands.registerCommand(
      detailCommands.COPY_TO_CLIPBOARD,
      (element: DetailTreeItem) => {
        this._copyToClipboard(element);
      }
    );
  }

  /**
   * Show details for the selected item in the Instances view
   * @param selection the selected items
   */
  public showDetailsForSelection(selection: any[]): void {
    if (selection) {
      const command =
        Commands.VIEW.STREAMS_EXPLORER.STREAMS_DETAILS.SHOW_DETAILS_FOR_ITEM;
      if (!selection.length) {
        commands.executeCommand(command, null, null);
      } else {
        let element = null;
        const [selectedElement] = selection;
        let { type } = selectedElement;
        switch (type) {
          case TreeItemType.Instance:
            element = (selectedElement as InstanceTreeItem).instance;
            break;
          case TreeItemType.CpdSpace:
            element = (selectedElement as CpdSpaceTreeItem).space;
            break;
          case TreeItemType.CpdProject:
            element = (selectedElement as CpdProjectTreeItem).project;
            break;
          case TreeItemType.CpdJob:
            element = (selectedElement as CpdJobTreeItem).job;
            break;
          case TreeItemType.CpdJobRun:
            element = (selectedElement as CpdJobRunTreeItem).jobRun;
            break;
          case TreeItemType.CpdJobRunLog:
            element = (selectedElement as CpdJobRunLogTreeItem).jobRunLog;
            break;
          case TreeItemType.Job:
            element = (selectedElement as JobTreeItem).job;
            break;
          case TreeItemType.BuildService:
            element = (selectedElement as LabelTreeItem).data;
            break;
          case TreeItemType.BuildPool:
            element = (selectedElement as BuildPoolTreeItem).buildPool;
            break;
          case TreeItemType.BaseImage:
            element = (selectedElement as BaseImageTreeItem).baseImage;
            break;
          default:
            type = null;
            break;
        }
        commands.executeCommand(command, type, element, selectedElement);
      }
    }
  }

  /**
   * Show details
   * @param type the element type
   * @param element the element
   * @param selectedTreeItem the selected tree item
   */
  private _showDetails(
    type: string,
    element: any,
    selectedTreeItem: StreamsTreeItem
  ): void {
    switch (type) {
      case TreeItemType.Instance:
        const newElement = element.streamsInstance
          ? _cloneDeep(element.streamsInstance)
          : {};
        newElement.connectionDetails = this._getConnectionDetails(element);

        const instanceType = InstanceSelector.selectInstanceType(
          store.getState(),
          element.connectionId
        );
        if (
          instanceType === StreamsInstanceType.V5_CPD ||
          instanceType === StreamsInstanceType.V5_STANDALONE
        ) {
          const streamsAuthToken =
            InstanceSelector.selectStreamsAuthToken(
              store.getState(),
              element.connectionId
            ) || null;
          if (streamsAuthToken !== null) {
            if (instanceType === StreamsInstanceType.V5_CPD) {
              newElement.serviceToken = streamsAuthToken;
            } else {
              newElement.bearerToken = streamsAuthToken;
            }
          }
        }

        const propertiesSelector =
          instanceType === StreamsInstanceType.V4_STREAMING_ANALYTICS
            ? 'v4'
            : 'v5';
        this._treeDataProvider.generateTreeData(
          newElement,
          instanceProperties[propertiesSelector]
        );
        break;
      case TreeItemType.CpdSpace:
        this._treeDataProvider.generateTreeData(
          { ...element.entity, ...element.metadata },
          cpdSpaceProperties
        );
        break;
      case TreeItemType.CpdProject:
        this._treeDataProvider.generateTreeData(
          { ...element.entity, ...element.metadata },
          cpdProjectProperties
        );
        break;
      case TreeItemType.CpdJob:
        const sabAsset = InstanceSelector.selectCloudPakForDataJobApplicationAssetInSpace(
          store.getState(),
          (selectedTreeItem as CpdJobTreeItem).instance.connectionId,
          (selectedTreeItem as CpdJobTreeItem).space
            ? CloudPakForDataJobType.Space
            : CloudPakForDataJobType.Project,
          (selectedTreeItem as CpdJobTreeItem).spaceId ||
            (selectedTreeItem as CpdJobTreeItem).projectId,
          (selectedTreeItem as CpdJobTreeItem).jobId
        );
        this._treeDataProvider.generateTreeData(
          {
            ...element.entity.job,
            ...element.metadata,
            ...(sabAsset && {
              sabAsset: [
                {
                  label: 'Name',
                  value: sabAsset.path.replace(
                    `jobs/${element.metadata.asset_id}/`,
                    ''
                  )
                },
                {
                  label: 'Last modified',
                  value: new Date(sabAsset.last_modified).toLocaleString()
                }
              ]
            })
          },
          cpdJobProperties
        );
        break;
      case TreeItemType.CpdJobRun:
        this._treeDataProvider.generateTreeData(
          {
            ...element.entity.job_run,
            ...element.metadata,
            ...(element.streamsJob && { streamsJob: element.streamsJob })
          },
          cpdJobRunProperties
        );
        break;
      case TreeItemType.CpdJobRunLog:
        this._treeDataProvider.generateTreeData(
          element,
          cpdJobRunLogProperties
        );
        break;
      case TreeItemType.Job:
        this._treeDataProvider.generateTreeData(element, jobProperties);
        break;
      case TreeItemType.BuildService:
        if (element) {
          this._treeDataProvider.generateTreeData(
            element,
            buildServiceProperties.buildService
          );
        } else {
          this._clearDetails();
        }
        break;
      case TreeItemType.BuildPool:
        this._treeDataProvider.generateTreeData(
          element,
          buildServiceProperties.buildPool
        );
        break;
      case TreeItemType.BaseImage:
        this._treeDataProvider.generateTreeData(
          element,
          buildServiceProperties.baseImage
        );
        break;
      default:
        this._clearDetails();
        break;
    }
  }

  /**
   * Clear the details
   */
  private _clearDetails(): void {
    this._treeDataProvider.setTreeData(null);
    this._treeDataProvider.refresh();
  }

  /**
   * Open a detail's home page
   * @param element the detail tree item
   */
  private async _copyToClipboard(element: DetailTreeItem): Promise<void> {
    if (element && element.value) {
      let { value } = element;
      if (Array.isArray(value)) {
        value = JSON.stringify(value, null, 2);
      }
      try {
        const json = JSON.parse(value);
        value = JSON.stringify(json, null, 2);
      } catch (err) {
        // Do nothing
      }
      await VSCode.copyToClipboard(value);
    }
  }

  /**
   * Obtain instance connection details
   * @param instance the Streams instance
   */
  private _getConnectionDetails(instance: any): any {
    const { connectionId, instanceType, authentication } = instance;
    const instanceTypeDetail = {
      label: 'Streams version',
      value: Streams.getEnvNameFromKey(instanceType)
    };
    switch (instanceType) {
      case StreamsInstanceType.V5_CPD:
        return [
          instanceTypeDetail,
          {
            label: 'Cloud Pak for Data URL',
            value: authentication.cpdUrl
          },
          {
            label: 'Cloud Pak for Data version',
            value: InstanceSelector.selectCloudPakForDataVersion(
              store.getState(),
              connectionId,
              false
            )
          },
          {
            label: 'Cloud Pak for Data username',
            value: authentication.username
          }
        ];
      case StreamsInstanceType.V5_STANDALONE:
        return [
          instanceTypeDetail,
          {
            label: 'Streams REST service URL',
            value: authentication.streamsRestServiceUrl
          },
          ...(authentication.streamsBuildServiceUrl
            ? [
                {
                  label: 'Streams build service URL',
                  value: authentication.streamsBuildServiceUrl
                }
              ]
            : []),
          ...(authentication.streamsConsoleUrl
            ? [
                {
                  label: 'Streams Console URL',
                  value: authentication.streamsConsoleUrl
                }
              ]
            : []),
          {
            label: 'Streams username',
            value: authentication.username
          }
        ];
      case StreamsInstanceType.V4_STREAMING_ANALYTICS:
        return [
          instanceTypeDetail,
          {
            label: 'Streaming Analytics service API key',
            value: authentication.credentials.apikey
          },
          {
            label: 'Streaming Analytics service V2 REST URL',
            value: authentication.credentials.v2_rest_url
          }
        ];
      default:
        break;
    }
    return null;
  }
}
