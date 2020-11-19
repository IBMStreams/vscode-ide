import { InstanceSelector, observeStore, store } from '@ibmstreams/common';
import _omit from 'lodash/omit';
import {
  commands,
  ExtensionContext,
  TreeView,
  TreeViewExpansionEvent,
  TreeViewSelectionChangeEvent,
  window
} from 'vscode';
import { getStreamsExplorer } from '../..';
import { Commands } from '../../../commands';
import { CpdJobRun, Streams, StreamsInstance } from '../../../streams';
import { Views } from '../../../utils';
import InstancesProvider from './provider';
import {
  BaseImageTreeItem,
  CpdJobRunLogTreeItem,
  CpdJobRunTreeItem,
  CpdJobTreeItem,
  CpdProjectTreeItem,
  CpdSpaceTreeItem,
  InstanceTreeItem,
  JobTreeItem,
  LabelTreeItem,
  StreamsTreeItem
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
   * @param instance the instance
   */
  public async addInstance(instance: any): Promise<void> {
    const newInstance = _omit(instance, [
      'streamsInstance',
      'streamsJobGroups',
      'streamsJobs',
      'zenJobs'
    ]);
    Streams.setDefaultInstanceEnvContext();

    const storedInstances = Streams.getInstances();

    const instanceInState = storedInstances.find(
      (storedInstance: any) =>
        storedInstance.connectionId === newInstance.connectionId
    );
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
      const command =
        Commands.VIEW.STREAMS_EXPLORER.STREAMS_DETAILS.SHOW_DETAILS_FOR_ITEM;
      if (selectedElements && selectedElements.length) {
        const [selectedElement] = selectedElements;
        const { type } = selectedElement;
        if (type === 'instance') {
          const {
            instance: selectedInstance
          } = selectedElement as InstanceTreeItem;
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
   * @param connectionId the target instance connection identifier
   */
  public watchStreamsInstance(connectionId: string): void {
    const onChange = (): void => {
      this._treeDataProvider.refresh();
    };
    const unsubscribe = observeStore(
      store,
      InstanceSelector.selectStreamsInstanceInfo,
      [connectionId],
      onChange
    );
    this._reduxUnsubscribeFns[connectionId] = unsubscribe;
  }

  /**
   * Stop watching for changes to a Streams instance
   * @param connectionId the target instance connection identifier
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
    this._context.subscriptions.push(
      this._treeView.onDidExpandElement(
        (e: TreeViewExpansionEvent<StreamsTreeItem>) => {
          // When user expands an instance node, authenticate to the instance
          const { element } = e;
          if (element) {
            const { contextValue } = element;
            if (
              contextValue.includes('_instanceTreeItem') &&
              !contextValue.includes('_auth')
            ) {
              StreamsInstance.authenticate(
                (element as InstanceTreeItem).instance,
                false,
                null
              );
            }
          }
        }
      )
    );
    this._context.subscriptions.push(
      this._treeView.onDidChangeSelection(
        (e: TreeViewSelectionChangeEvent<StreamsTreeItem>) => {
          // When user selects a node, then display the node details in the Details view
          getStreamsExplorer()
            .getDetailsView()
            .showDetailsForSelection(e.selection);
        }
      )
    );
  }

  /**
   * Register tree view commands
   */
  private _registerCommands(): void {
    const instanceCommands = Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES;

    // General instance commands
    commands.registerCommand(instanceCommands.GENERAL.ADD_INSTANCE, () =>
      StreamsInstance.addInstance()
    );
    commands.registerCommand(instanceCommands.GENERAL.REMOVE_INSTANCES, () =>
      StreamsInstance.removeInstances()
    );
    commands.registerCommand(instanceCommands.GENERAL.REFRESH_INSTANCES, () =>
      StreamsInstance.refreshInstances()
    );

    // Instance commands
    commands.registerCommand(
      instanceCommands.INSTANCE.AUTHENTICATE,
      (element: InstanceTreeItem | any) =>
        StreamsInstance.authenticate(element, false, null)
    );
    commands.registerCommand(
      instanceCommands.INSTANCE.SUBMIT_JOB,
      (element: InstanceTreeItem) => element.submitJob()
    );
    commands.registerCommand(
      instanceCommands.INSTANCE.OPEN_CPD_DETAILS,
      (element: InstanceTreeItem) => element.openCpdInstanceDetails()
    );
    commands.registerCommand(
      instanceCommands.INSTANCE.OPEN_CONSOLE,
      (element: InstanceTreeItem) => element.openStreamsConsole()
    );
    commands.registerCommand(
      instanceCommands.INSTANCE.SET_DEFAULT,
      (element: InstanceTreeItem) => StreamsInstance.setDefaultInstance(element)
    );
    commands.registerCommand(
      instanceCommands.INSTANCE.REMOVE,
      (element: InstanceTreeItem) => StreamsInstance.removeInstance(element)
    );
    commands.registerCommand(
      instanceCommands.INSTANCE.REFRESH,
      (element: InstanceTreeItem) => StreamsInstance.refreshInstance(element)
    );

    // Cloud Pak for Data space commands
    commands.registerCommand(
      instanceCommands.CPD_SPACE.OPEN_CPD_DETAILS,
      (element: CpdSpaceTreeItem) => element.openCpdDetails()
    );

    // Cloud Pak for Data project commands
    commands.registerCommand(
      instanceCommands.CPD_PROJECT.OPEN_CPD_DETAILS,
      (element: CpdProjectTreeItem) => element.openCpdDetails()
    );

    // Job commands
    commands.registerCommand(
      instanceCommands.JOB.OPEN_CPD_DETAILS,
      (element: JobTreeItem) => element.openCpdJobDetails()
    );
    commands.registerCommand(
      instanceCommands.JOB.OPEN_CPD_PROJECT,
      (element: JobTreeItem) => element.openCpdProject()
    );
    commands.registerCommand(
      instanceCommands.JOB.DOWNLOAD_LOGS,
      (element: JobTreeItem) => element.downloadLogs()
    );
    commands.registerCommand(
      instanceCommands.JOB.CANCEL_JOB,
      (element: JobTreeItem) => element.cancel()
    );

    // Cloud Pak for Data job commands
    commands.registerCommand(
      instanceCommands.CPD_JOB.OPEN_CPD_DETAILS,
      (element: CpdJobTreeItem) => element.openCpdDetails()
    );
    commands.registerCommand(
      instanceCommands.CPD_JOB.EDIT_JOB,
      (element: CpdJobTreeItem) => element.editJob()
    );
    commands.registerCommand(
      instanceCommands.CPD_JOB.DELETE_JOB,
      (element: CpdJobTreeItem) => element.deleteJob()
    );
    commands.registerCommand(
      instanceCommands.CPD_JOB.START_JOB_RUN,
      (element: CpdJobTreeItem) => element.startJobRun()
    );

    // Cloud Pak for Data job run commands
    commands.registerCommand(
      instanceCommands.CPD_JOB_RUN.OPEN_CPD_DETAILS,
      (element: CpdJobRunTreeItem) => element.openCpdDetails()
    );
    commands.registerCommand(
      instanceCommands.CPD_JOB_RUN.CREATE_LOG_SNAPSHOT,
      (element: CpdJobRunTreeItem) => element.createJobRunLogSnapshot()
    );
    commands.registerCommand(
      instanceCommands.CPD_JOB_RUN.CANCEL,
      (element: CpdJobRunTreeItem) => element.cancelJobRun()
    );
    commands.registerCommand(
      instanceCommands.CPD_JOB_RUN.DELETE,
      (element: CpdJobRunTreeItem) => element.deleteJobRun()
    );

    // Cloud Pak for Data job run log commands
    commands.registerCommand(
      instanceCommands.CPD_JOB_RUN_LOG.DELETE_MULTIPLE,
      async (element: LabelTreeItem) => {
        try {
          const {
            connectionId,
            spaceId,
            projectId,
            jobId,
            jobName,
            jobRunId,
            jobRunName
          } = element.data;
          if (
            connectionId &&
            (spaceId || projectId) &&
            jobId &&
            jobName &&
            jobRunId &&
            jobRunName
          ) {
            await CpdJobRun.deleteJobRunLogs(
              connectionId,
              spaceId,
              projectId,
              jobId,
              jobName,
              jobRunId,
              jobRunName
            );
            return;
          }
          throw new Error();
        } catch (err) {
          CpdJobRun.handleError(err);
        }
      }
    );
    commands.registerCommand(
      instanceCommands.CPD_JOB_RUN_LOG.DELETE,
      (element: CpdJobRunLogTreeItem) => element.deleteLog()
    );
    commands.registerCommand(
      instanceCommands.CPD_JOB_RUN_LOG.DOWNLOAD,
      (element: CpdJobRunLogTreeItem) => element.downloadLog()
    );

    // Base image commands
    commands.registerCommand(
      instanceCommands.BASE_IMAGE.BUILD_IMAGE,
      (element: BaseImageTreeItem) => element.buildImage()
    );
    commands.registerCommand(
      instanceCommands.BASE_IMAGE.COPY_ID,
      (element: BaseImageTreeItem) => element.copyId()
    );
  }
}
