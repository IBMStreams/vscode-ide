import { InstanceSelector, store, StreamsInstanceType } from '@ibmstreams/common';
import _cloneDeep from 'lodash/cloneDeep';
import _has from 'lodash/has';
import _isEqual from 'lodash/isEqual';
import * as path from 'path';
import {
    commands, Event, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, window
} from 'vscode';
import { Commands } from '../../commands';
import { Streams } from '../../streams';
import { BuiltInCommands, Views, VSCode } from '../../utils';
import {
    BaseImageTreeItem, BuildPoolTreeItem, InstanceTreeItem, JobTreeItem, LabelTreeItem, TreeItemType
} from './instancesView/treeItems';

const instanceProperties = {
    v5: [
        { name: 'applicationConfigurations', label: 'Application configurations', isUrl: true },
        { name: 'applicationEnvironmentVariables', label: 'Application environment variables', isUrl: true },
        { name: 'bearerToken', label: 'Bearer token' },
        { name: 'connectionDetails', label: 'Connection details', mapFn: (detail: any) => ({ label: detail.label, value: detail.value }) },
        { name: 'applicationResourceTags', label: 'Application resource tags', mapFn: (tag: any) => ({ label: tag, value: null }) },
        { name: 'exportedStreams', label: 'Exported streams', isUrl: true },
        { name: 'groups', label: 'Groups', isUrl: true },
        { name: 'health', label: 'Health' },
        { name: 'id', label: 'ID' },
        { name: 'importedStreams', label: 'Imported streams', isUrl: true },
        { name: 'jobGroups', label: 'Job groups', isUrl: true },
        { name: 'jobMetricMetadata', label: 'Job metric metadata', isUrl: true },
        { name: 'jobs', label: 'Jobs', isUrl: true },
        { name: 'jobsMetricsSnapshot', label: 'Job metrics snapshot', isUrl: true },
        { name: 'jobsNotificationsSnapshot', label: 'Jobs notifications snapshot', isUrl: true },
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
        { name: 'restrictedConfigurations', label: 'Restricted configurations', isUrl: true },
        { name: 'securedObjects', label: 'Secured objects', isUrl: true },
        {
            name: 'services',
            label: 'Services',
            mapFn: (service: any) => {
                const detail = { label: service.name, value: service.status, ...service.leader && { children: [{ label: 'leader', value: service.leader }] } };
                return detail;
            }
        },
        { name: 'serviceToken', label: 'Service token' },
        { name: 'startTime', label: 'Start time', formatFn: (time: number) => new Date(time).toLocaleString() },
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
        { name: 'connectionDetails', label: 'Connection details', mapFn: (detail: any) => ({ label: detail.label, value: detail.value }) },
        { name: 'creationTime', label: 'Creation time', formatFn: (time: number) => new Date(time).toLocaleString() },
        { name: 'creationUser', label: 'Creation user' },
        { name: 'domain', label: 'Domain', isUrl: true },
        { name: 'exportedStreams', label: 'Exported streams', isUrl: true },
        { name: 'health', label: 'Health' },
        { name: 'hosts', label: 'Hosts', isUrl: true },
        { name: 'id', label: 'ID' },
        { name: 'importedStreams', label: 'Imported streams', isUrl: true },
        { name: 'jobs', label: 'Jobs', isUrl: true },
        { name: 'jobsMetricsSnapshot', label: 'Jobs metrics snapshot', isUrl: true },
        { name: 'jobsSnapshot', label: 'Jobs snapshot', isUrl: true },
        { name: 'operatorConnections', label: 'Operator connections', isUrl: true },
        { name: 'operators', label: 'Operators', isUrl: true },
        { name: 'owner', label: 'Owner' },
        { name: 'peConnections', label: 'PE connections', isUrl: true },
        { name: 'pes', label: 'PEs', isUrl: true },
        { name: 'resourceAllocations', label: 'Resource allocations', isUrl: true },
        { name: 'restrictedTags', label: 'Restricted tags', mapFn: (tag: any) => ({ label: tag, value: null }) },
        { name: 'startTime', label: 'Start time', formatFn: (time: number) => new Date(time).toLocaleString() },
        { name: 'startedBy', label: 'Started by' },
        { name: 'status', label: 'Status' },
        { name: 'views', label: 'Views', isUrl: true }
    ]
};

const jobProperties = [
    { name: 'applicationName', label: 'Application name' },
    { name: 'checkpointPath', label: 'Checkpoint path' },
    { name: 'health', label: 'Health' },
    { name: 'id', label: 'ID' },
    { name: 'metricsSnapshot', label: 'Metrics snapshot', isUrl: true },
    { name: 'name', label: 'Name' },
    { name: 'notificationsSnapshot', label: 'Notifications snapshot', isUrl: true },
    { name: 'operators', label: 'Operators', isUrl: true },
    { name: 'outputPath', label: 'Output path' },
    { name: 'pes', label: 'PEs', isUrl: true },
    { name: 'productVersion', label: 'Product version' },
    { name: 'resources', label: 'Resources', isUrl: true },
    { name: 'snapshot', label: 'Snapshot', isUrl: true },
    { name: 'startedBy', label: 'Started by' },
    { name: 'status', label: 'Status' },
    { name: 'submitParameters', label: 'Submit parameters', mapFn: (parameter: any) => ({ label: parameter.name, value: parameter.value }) },
    { name: 'submitTime', label: 'Submit time', formatFn: (time: number) => new Date(time).toLocaleString() },
    { name: 'threadingModel', label: 'Threading model' },
    { name: 'views', label: 'Views', isUrl: true }
];

const buildServiceProperties = {
    buildService: [
        { name: 'buildPools', label: 'Build pools', isUrl: true },
        { name: 'builds', label: 'Builds', isUrl: true },
        { name: 'logs', label: 'Logs', isUrl: true },
        { name: 'name', label: 'Name' },
        { name: 'traceFileCount', label: 'Trace file count' },
        { name: 'traceFileSize', label: 'Trace file size' },
        { name: 'traceLevel', label: 'Trace level' },
        { name: 'version', label: 'Version' }
    ],
    buildPool: [
        { name: 'buildInactivityTimeout', label: 'Build inactivity timeout' },
        { name: 'buildProcessingTimeout', label: 'Build processing timeout' },
        { name: 'buildProcessingTimeoutMaximum', label: 'Build processing timeout maximum' },
        { name: 'buildProductVersion', label: 'Build product version' },
        { name: 'buildingCount', label: 'Building count' },
        { name: 'logs', label: 'Logs', isUrl: true },
        { name: 'name', label: 'Name' },
        { name: 'resourceWaitTimeout', label: 'Resource wait timeout' },
        { name: 'sizeMaximum', label: 'Size maximum' },
        { name: 'sizeMinimum', label: 'Size minimum' },
        { name: 'status', label: 'Status' },
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
        commands.registerCommand(detailCommands.SHOW_DETAILS_FOR_ITEM, (type: string, element: any) => {
            this._showDetails(type, element);
        });
        commands.registerCommand(detailCommands.COPY_TO_CLIPBOARD, (element: DetailTreeItem) => {
            this._copyToClipboard(element);
        });
    }

    /**
     * Show details for the selected item in the Instances view
     * @param selection    The selected items
     */
    public showDetailsForSelection(selection: any[]): void {
        if (selection) {
            const command = Commands.VIEW.STREAMS_EXPLORER.STREAMS_DETAILS.SHOW_DETAILS_FOR_ITEM;
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
                commands.executeCommand(command, type, element);
            }
        }
    }

    /**
     * Show details
     * @param type       The element type
     * @param element    The element
     */
    private _showDetails(type: string, element: any): void {
        switch (type) {
            case TreeItemType.Instance:
                const newElement = element.streamsInstance ? _cloneDeep(element.streamsInstance) : {};
                newElement.connectionDetails = this._getConnectionDetails(element);

                const instanceType = InstanceSelector.selectInstanceType(store.getState(), element.connectionId);
                if (instanceType === StreamsInstanceType.V5_CPD || instanceType === StreamsInstanceType.V5_STANDALONE) {
                    const streamsAuthToken = InstanceSelector.selectStreamsAuthToken(store.getState(), element.connectionId) || null;
                    if (streamsAuthToken !== null) {
                        if (instanceType === StreamsInstanceType.V5_CPD) {
                            newElement.serviceToken = streamsAuthToken;
                        } else {
                            newElement.bearerToken = streamsAuthToken;
                        }
                    }
                }

                const propertiesSelector = instanceType === StreamsInstanceType.V4_STREAMING_ANALYTICS ? 'v4' : 'v5';
                this._treeDataProvider.generateTreeData(newElement, instanceProperties[propertiesSelector]);
                break;
            case TreeItemType.Job:
                this._treeDataProvider.generateTreeData(element, jobProperties);
                break;
            case TreeItemType.BuildService:
                if (element) {
                    this._treeDataProvider.generateTreeData(element, buildServiceProperties.buildService);
                } else {
                    this._clearDetails();
                }
                break;
            case TreeItemType.BuildPool:
                this._treeDataProvider.generateTreeData(element, buildServiceProperties.buildPool);
                break;
            case TreeItemType.BaseImage:
                this._treeDataProvider.generateTreeData(element, buildServiceProperties.baseImage);
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
     * @param element    The detail tree item
     */
    private async _copyToClipboard(element: DetailTreeItem): Promise<void> {
        if (element && element.value) {
            await VSCode.copyToClipboard(element.value);
        }
    }

    /**
     * Obtain instance connection details
     * @param instance    The Streams instance
     */
    private _getConnectionDetails(instance: any): any {
        const { instanceType, authentication } = instance;
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
                        value: authentication.cpdVersion.substring(1)
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
                    ...authentication.streamsBuildServiceUrl ? [{
                        label: 'Streams build service URL',
                        value: authentication.streamsBuildServiceUrl
                    }] : [],
                    ...authentication.streamsSecurityServiceUrl ? [{
                        label: 'Streams security service URL',
                        value: authentication.streamsSecurityServiceUrl
                    }] : [],
                    ...authentication.streamsConsoleUrl ? [{
                        label: 'Streams Console URL',
                        value: authentication.streamsConsoleUrl
                    }] : [],
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

/**
 * Tree item that represents a detail
 */
interface DetailTreeItem {
    label: string;
    value?: string;
    isUrl?: boolean;
    children?: DetailTreeItem[] | null;
}

/**
 * A tree data provider that provides detail data
 */
class DetailsProvider implements TreeDataProvider<DetailTreeItem> {
    private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
    public readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;
    private _extensionPath: string;
    private _defaultTreeData = { label: 'Select an item in the Instances view to display its details.' };
    private _treeData: any;

    constructor(extensionPath: string) {
        this._extensionPath = extensionPath;
        this._treeData = null;
    }

    public getChildren(element?: DetailTreeItem): DetailTreeItem[] {
        return element ? element.children : (this._treeData || [this._defaultTreeData]);
    }

    public getTreeItem(element: DetailTreeItem): TreeItem {
        const { label, value, isUrl, children } = element;
        const isDefaultItem = _isEqual(element, this._defaultTreeData);
        let iconPath = null;
        let command = null;
        if (isDefaultItem) {
            iconPath = {
                light: path.join(this._extensionPath, 'images', 'icons', 'light', 'information.svg'),
                dark: path.join(this._extensionPath, 'images', 'icons', 'dark', 'information.svg')
            };
            command = {
                title: '',
                command: `${Views.StreamsInstances}.${BuiltInCommands.ShowView}`,
                arguments: null
            };
        } else if (isUrl) {
            command = {
                title: '',
                command: BuiltInCommands.Open,
                arguments: [Uri.parse(value)]
            };
        }

        let collapsibleState: TreeItemCollapsibleState;
        if (label === 'Connection details' && value === null) {
            collapsibleState = TreeItemCollapsibleState.Expanded;
        } else {
            collapsibleState = children
                ? TreeItemCollapsibleState.Collapsed
                : TreeItemCollapsibleState.None;
        }

        return {
            label,
            description: value || null,
            collapsibleState,
            contextValue: (isDefaultItem || children) ? null : 'detailTreeItem',
            ...iconPath && { iconPath },
            command
        };
    }

    /**
     * Refresh the view
     */
    public refresh(): void {
        // This calls getChildren
        this._onDidChangeTreeData.fire();
    }

    /**
     * Set tree data
     * @param data    The tree data
     */
    public setTreeData(data: any): void {
        this._treeData = data;
    }

    /**
     * Generate tree data
     * @param element       The element
     * @param properties    The element properties to display
     */
    public generateTreeData(element: any, properties: any): DetailTreeItem[] {
        if (!element || !properties) {
            return;
        }
        this._treeData = properties
            .filter((property: any) => _has(element, property.name))
            .map((property: any) => {
                const {
                    name, label, isUrl, formatFn, mapFn, childProperties
                } = property;
                const propertyValue = element[name];
                if (childProperties) {
                    const children = Object.keys(propertyValue)
                        .sort()
                        .map((key) => {
                            const matchingProperty = childProperties.find((childProperty: any) => childProperty.name === key);
                            return matchingProperty ? {
                                label: matchingProperty.label,
                                value: propertyValue[key]
                            } : null;
                        })
                        .filter((child) => child !== null);
                    return {
                        label,
                        value: null,
                        children: children && children.length ? children : [{ label: 'None' }]
                    };
                }
                if (mapFn) {
                    const children = propertyValue.map(mapFn);
                    return {
                        label,
                        value: null,
                        children: children && children.length ? children : [{ label: 'None' }]
                    };
                }
                const strPropertyValue = propertyValue.toString ? propertyValue.toString() : propertyValue;
                return {
                    label,
                    value: formatFn ? formatFn(propertyValue) : strPropertyValue,
                    isUrl
                };
            });
        this.refresh();
    }
}
