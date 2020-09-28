import { InstanceSelector, observeStore, store } from '@ibmstreams/common';
import _omit from 'lodash/omit';
import {
    commands,
    Event,
    EventEmitter,
    ExtensionContext,
    TreeDataProvider,
    TreeItem,
    TreeView,
    TreeViewExpansionEvent,
    TreeViewSelectionChangeEvent,
    window
} from 'vscode';
import { getStreamsExplorer } from '../..';
import { Commands } from '../../../commands';
import { Streams, StreamsInstance } from '../../../streams';
import { Logger, Views } from '../../../utils';
import {
    BaseImageTreeItem,
    BuildPoolTreeItem,
    InfoTreeItem,
    InstanceTreeItem,
    JobGroupTreeItem,
    JobTreeItem,
    LabelTreeItem,
    StreamsTreeItem,
    TreeItemType
} from './treeItems';

/**
 * Represents the Instances view
 */
export default class InstancesView {
    private _context: ExtensionContext;
    private _treeDataProvider: InstancesProvider;
    private _treeView: TreeView<any>;
    private _reduxUnsubscribeFns: any = {};

    constructor(context: ExtensionContext) {
        this._context = context;
        this._treeDataProvider = new InstancesProvider(context.extensionPath);
        this._treeView = window.createTreeView(Views.StreamsInstances, {
            treeDataProvider: this._treeDataProvider,
            showCollapseAll: true
        });

        this._initializeInstances();
        this._handleChanges();
        this._registerCommands();
    }

    /**
     * Add or update an instance
     * @param instance    The instance
     */
    public async addInstance(instance: any): Promise<void> {
        const newInstance = _omit(instance, ['streamsInstance', 'streamsJobGroups', 'streamsJobs', 'zenJobs']);
        Streams.setDefaultInstanceEnvContext();

        const storedInstances = Streams.getInstances();

        const instanceInState = storedInstances.find((storedInstance: any) => storedInstance.connectionId === newInstance.connectionId);
        if (instanceInState) {
            instanceInState.authentication = newInstance.authentication;
        } else {
            storedInstances.push(newInstance);
        }

        await Streams.setInstances(storedInstances);

        Streams.setDefaultInstanceEnvContext();
        this._treeDataProvider.refresh();

        // Update details view if the new instance is selected
        const selectedElements = this.getSelected();
        if (selectedElements) {
            const command = Commands.VIEW.STREAMS_EXPLORER.STREAMS_DETAILS.SHOW_DETAILS_FOR_ITEM;
            if (selectedElements && selectedElements.length) {
                const [selectedElement] = selectedElements;
                const { type } = selectedElement;
                if (type === 'instance') {
                    const { instance: selectedInstance } = selectedElement as InstanceTreeItem;
                    if (selectedInstance.connectionId === newInstance.connectionId) {
                        commands.executeCommand(command, type, newInstance);
                    }
                }
            }
        }
    }

    /**
     * Refresh the view
     */
    public refresh(): void {
        this._treeDataProvider.refresh();
    }

    /**
     * Get the currently selected elements
     */
    public getSelected(): StreamsTreeItem[] {
        return this._treeView.selection;
    }

    /**
     * Watch for changes to a Streams instance
     * @param connectionId    The target instance connection identifier
     */
    public watchStreamsInstance(connectionId: string): void {
        const onChange = (): void => {
            this._treeDataProvider.refresh();
        };
        const unsubscribe = observeStore(store, InstanceSelector.selectStreamsInstanceInfo, [connectionId], onChange);
        this._reduxUnsubscribeFns[connectionId] = unsubscribe;
    }

    /**
     * Stop watching for changes to a Streams instance
     * @param connectionId    The target instance connection identifier
     */
    public unwatchStreamsInstance(connectionId: string): void {
        const unsubscribe = this._reduxUnsubscribeFns[connectionId];
        if (unsubscribe) {
            unsubscribe();
            delete this._reduxUnsubscribeFns[connectionId];
        }
    }

    /**
     * Initialize instances
     */
    private async _initializeInstances(): Promise<void> {
        const storedInstances = Streams.getInstances();
        if (!storedInstances) {
            await Streams.setInstances([]);
        }
        Streams.setDefaultInstanceEnvContext();
    }

    /**
     * Handle tree view changes
     */
    private _handleChanges(): void {
        this._context.subscriptions.push(this._treeView.onDidExpandElement((e: TreeViewExpansionEvent<StreamsTreeItem>) => {
            // When user expands an instance node, authenticate to the instance
            const { element } = e;
            if (element) {
                const { contextValue } = element;
                if (contextValue.includes('_instanceTreeItem') && !contextValue.includes('_auth')) {
                    StreamsInstance.authenticate((element as InstanceTreeItem).instance, false, null);
                }
            }
        }));
        this._context.subscriptions.push(this._treeView.onDidChangeSelection((e: TreeViewSelectionChangeEvent<StreamsTreeItem>) => {
            // When user selects a node, then display the node details in the Details view
            getStreamsExplorer().getDetailsView().showDetailsForSelection(e.selection);
        }));
    }

    /**
     * Register tree view commands
     */
    private _registerCommands(): void {
        const instanceCommands = Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES;

        // General instance commands
        commands.registerCommand(instanceCommands.GENERAL.ADD_INSTANCE, () => StreamsInstance.addInstance());
        commands.registerCommand(instanceCommands.GENERAL.REMOVE_INSTANCES, () => StreamsInstance.removeInstances());
        commands.registerCommand(instanceCommands.GENERAL.REFRESH_INSTANCES, () => StreamsInstance.refreshInstances());

        // Instance commands
        commands.registerCommand(instanceCommands.INSTANCE.AUTHENTICATE, (element: InstanceTreeItem | any) => StreamsInstance.authenticate(element, false, null));
        commands.registerCommand(instanceCommands.INSTANCE.OPEN_CPD_DETAILS, (element: InstanceTreeItem) => element.openCpdInstanceDetails());
        commands.registerCommand(instanceCommands.INSTANCE.OPEN_CONSOLE, (element: InstanceTreeItem) => element.openStreamsConsole());
        commands.registerCommand(instanceCommands.INSTANCE.SET_DEFAULT, (element: InstanceTreeItem) => StreamsInstance.setDefaultInstance(element));
        commands.registerCommand(instanceCommands.INSTANCE.REMOVE, (element: InstanceTreeItem) => StreamsInstance.removeInstance(element));
        commands.registerCommand(instanceCommands.INSTANCE.REFRESH, (element: InstanceTreeItem) => StreamsInstance.refreshInstance(element));

        // Job commands
        commands.registerCommand(instanceCommands.JOB.OPEN_CPD_DETAILS, (element: JobTreeItem) => element.openCpdJobDetails());
        commands.registerCommand(instanceCommands.JOB.OPEN_CPD_PROJECT, (element: JobTreeItem) => element.openCpdProject());
        commands.registerCommand(instanceCommands.JOB.DOWNLOAD_LOGS, (element: JobTreeItem) => element.downloadLogs());
        commands.registerCommand(instanceCommands.JOB.CANCEL_JOB, (element: JobTreeItem) => element.cancel());

        // Base image commands
        commands.registerCommand(instanceCommands.BASE_IMAGE.BUILD_IMAGE, (element: BaseImageTreeItem) => element.buildImage());
        commands.registerCommand(instanceCommands.BASE_IMAGE.COPY_ID, (element: BaseImageTreeItem) => element.copyId());
    }
}

/**
 * A tree data provider that provides instance data
 */
class InstancesProvider implements TreeDataProvider<StreamsTreeItem> {
    private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
    public readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;
    private _extensionPath: string;

    constructor(extensionPath: string) {
        this._extensionPath = extensionPath;
    }

    public getChildren(element?: StreamsTreeItem): Promise<StreamsTreeItem[]> {
        return element ? element.children : this._createTreeItems();
    }

    public getTreeItem(element: StreamsTreeItem): TreeItem {
        return element;
    }

    /**
     * Refresh the view
     */
    public refresh(): void {
        // This calls getChildren
        this._onDidChangeTreeData.fire();
    }

    /**
     * Creates tree items from input data
     */
    private async _createTreeItems(): Promise<StreamsTreeItem[]> {
        const storedInstances = Streams.getInstances();

        // Handle scenario where there are no Streams instances
        if (!storedInstances.length) {
            const infoTreeItem = new InfoTreeItem(
                this._extensionPath,
                'There are no Streams instances available. Get started by adding an instance.',
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.GENERAL.ADD_INSTANCE
            );
            return [infoTreeItem];
        }

        // Process instances
        const treeItems = storedInstances.map((storedInstance: any) => {
            const { connectionId } = storedInstance;

            let streamsInstance = null;
            let streamsJobGroups = null;
            let streamsJobs = null;
            let buildService = null;
            const reduxInstance = InstanceSelector.selectInstance(store.getState(), connectionId);
            if (reduxInstance) {
                ({ streamsInstance, streamsJobGroups, streamsJobs, buildService } = reduxInstance);
            }

            let infoTreeItem: InfoTreeItem;

            // User is not authenticated to this instance
            if (!streamsInstance) {
                infoTreeItem = new InfoTreeItem(
                    this._extensionPath,
                    'Get started by authenticating to this instance.',
                    Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.INSTANCE.AUTHENTICATE,
                    storedInstance
                );
                return new InstanceTreeItem(
                    this._extensionPath,
                    storedInstance,
                    [infoTreeItem]
                );
            }

            const jobsLabelTreeItem = this._getJobsTreeItem(reduxInstance, streamsJobGroups, streamsJobs);
            const buildServiceLabelTreeItem = this._getBuildServiceTreeItem(reduxInstance, buildService);

            // Generate root instance item
            return new InstanceTreeItem(
                this._extensionPath,
                reduxInstance,
                [
                    ...(jobsLabelTreeItem && [jobsLabelTreeItem] || []),
                    ...(buildServiceLabelTreeItem && [buildServiceLabelTreeItem] || [])
                ]
            );
        });
        return treeItems;
    }

    /**
     * Get jobs tree item
     * ```
     * Jobs
     * ├── default
     * │   ├── {job1}
     * │   ├── {job2}
     * │   └── {jobX}
     * ├── {jobGroup1}
     * ├── {jobGroup2}
     * └── {jobGroupX}
     * ```
     */
    private _getJobsTreeItem(reduxInstance: any, streamsJobGroups: any, streamsJobs: any): any {
        try {
            // Generate grandchild job items grouped by job group
            const jobGroupMap = new Map();
            if (streamsJobs && streamsJobs.length) {
                streamsJobs.forEach((job: any): void => {
                    const jobGroup = job.jobGroup.split('/').pop();
                    if (!jobGroupMap.has(jobGroup)) {
                        jobGroupMap.set(jobGroup, []);
                    }
                    const jobsInGroup = jobGroupMap.get(jobGroup);
                    jobsInGroup.push(new JobTreeItem(this._extensionPath, job, reduxInstance));
                    jobGroupMap.set(jobGroup, jobsInGroup);
                });
            } else {
                const infoTreeItem = new InfoTreeItem(this._extensionPath, 'There are no jobs available.');
                return new LabelTreeItem('Jobs', null, null, [infoTreeItem]);
            }

            // Generate child job group items
            let jobGroupTreeItems: JobGroupTreeItem[] = [];
            if (streamsJobGroups && streamsJobGroups.length) {
                jobGroupTreeItems = streamsJobGroups.map((jobGroup: any): JobGroupTreeItem => {
                    const { name } = jobGroup;
                    let jobsInGroup = null;
                    if (jobGroupMap.has(name)) {
                        jobsInGroup = jobGroupMap.get(name);
                    }
                    return new JobGroupTreeItem(this._extensionPath, name, jobsInGroup);
                });
            }

            return new LabelTreeItem('Jobs', null, null, jobGroupTreeItems);
        } catch (err) {
            Logger.debug(null, `An error occurred while generating the jobs tree item for the instance with connection ID: ${reduxInstance.connectionId}.`, false, false);
            return null;
        }
    }

    /**
     * Get build service tree item
     * ```
     * Build service
     * └── Build pools
     *     ├── {applicationBuildPool}
     *     └── {imageBuildPool}
     *         └── Base images
     *             ├── {baseImage1} (default ✔)
     *             ├── {baseImage2}
     *             └── {baseImageX}
     * ```
     */
    private _getBuildServiceTreeItem(reduxInstance: any, buildService: any): any {
        const { connectionId } = reduxInstance;
        try {
            let buildServiceLabelTreeItem = null;
            if (buildService) {
                // Generate build pool tree items
                let buildServiceChildren = null;
                const buildPools = InstanceSelector.selectBuildPools(store.getState(), connectionId);
                if (buildPools && buildPools.length) {
                    const buildPoolLabelTreeItems = buildPools.map((buildPool: any) => {
                        let baseImagesLabelTreeItem = null;
                        // Generate base images tree items
                        if (buildPool.type === 'image') {
                            const baseImages = InstanceSelector.selectBaseImages(store.getState(), connectionId);
                            const imageBuildChildren = baseImages && baseImages.length
                                ? baseImages.map((baseImage: any) => new BaseImageTreeItem(this._extensionPath, baseImage, reduxInstance))
                                : [new InfoTreeItem(this._extensionPath, 'There are no base images available.')];
                            baseImagesLabelTreeItem = new LabelTreeItem('Base images', null, null, imageBuildChildren);
                        }
                        return new BuildPoolTreeItem(this._extensionPath, buildPool, baseImagesLabelTreeItem ? [baseImagesLabelTreeItem] : null);
                    });
                    buildServiceChildren = [new LabelTreeItem('Build pools', null, null, buildPoolLabelTreeItems)];
                } else {
                    buildServiceChildren = [new InfoTreeItem(this._extensionPath, 'There are no build pools available.')];
                }

                // Generate build service tree item
                const buildServiceProperties = InstanceSelector.selectBuildServiceProperties(store.getState(), connectionId);
                buildServiceLabelTreeItem = new LabelTreeItem('Build service', buildServiceProperties, TreeItemType.BuildService, buildServiceChildren);
            }
            return buildServiceLabelTreeItem;
        } catch (err) {
            Logger.debug(null, `An error occurred while generating the build service tree item for the instance with connection ID: ${connectionId}.`, false, false);
            return null;
        }
    }
}
