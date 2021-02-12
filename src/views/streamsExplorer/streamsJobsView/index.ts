import { commands, ExtensionContext, window, TreeView } from 'vscode';
import { Commands } from '../../../commands';
import { Views } from '../../../utils';
import { CpdSpaceTreeItem, TreeItemType } from '../instancesView/treeItems';
import JobsTreeItem from './streamsJobsTreeItem';
import { JobsProvider } from './provider';

/**
 * Represents the Jobs view
 */
export default class JobsView {
  private _treeDataProvider: JobsProvider;
  private _context: ExtensionContext;
  private _treeView: TreeView<any>;

  constructor(context: ExtensionContext) {
    this._context = context;
    this._treeDataProvider = new JobsProvider(context.extensionPath);
    this._treeView = window.createTreeView(Views.StreamsJobs, {
      treeDataProvider: this._treeDataProvider,
      showCollapseAll: true
    });

    const jobCommands = Commands.VIEW.STREAMS_EXPLORER.STREAMS_JOBS;
    commands.registerCommand(
      jobCommands.OPEN_CPD_DETAILS,
      (element: JobsTreeItem) => element.openCpdDetails()
    );
    commands.registerCommand(
      jobCommands.CREATE_LOG_SNAPSHOT,
      (element: JobsTreeItem) => element.createJobRunLogSnapshot()
    );
    commands.registerCommand(jobCommands.CANCEL, (element: JobsTreeItem) =>
      element.cancelJobRun()
    );
  }

  /**
   * Show runs for the selected item in the Instances view
   * @param selection the selected items
   */
  public showActiveRunsForSelection(selection: any[]): void {
    if (selection) {
      if (!selection.length) {
        this._showActiveRuns(null, null);
      } else {
        let element = null;
        const [selectedElement] = selection;
        const { type } = selectedElement;

        element =
          type === TreeItemType.Instance
            ? (selectedElement.children[0] as CpdSpaceTreeItem)
            : (selectedElement as CpdSpaceTreeItem);
        this._showActiveRuns(type, element);
      }
    }
  }

  /**
   * Show active runs
   * @param type the element type
   * @param element the element
   */
  public _showActiveRuns(type: string, element: any): void {
    if (type === TreeItemType.CpdJobRunLogsLabel) {
      return;
    } else if (
      element &&
      (element.space || element.project) &&
      (type === TreeItemType.Instance ||
        type === TreeItemType.CpdSpace ||
        type === TreeItemType.CpdProject)
    ) {
      const jobs = element.space ? element.space.jobs : element.project.jobs;
      this._treeDataProvider.generateTreeData(
        {
          ...jobs
        },
        element.instance,
        element.space,
        element.project,
        type
      );
      this._treeView.title = `Active Runs - ${element.label}`;
    } else if (
      type === TreeItemType.CpdJob ||
      type === TreeItemType.CpdJobRun ||
      type === TreeItemType.CpdJobRunLog
    ) {
      if (element.job.runs.length !== 0) {
        this._treeDataProvider.generateTreeData(
          {
            ...element.job
          },
          element.instance,
          element.space,
          element.project,
          type
        );
        this._treeView.title = `Active Runs - ${
          type === TreeItemType.CpdJobRun || type === TreeItemType.CpdJobRunLog
            ? element.job.metadata.name
            : element.label
        }`;
      } else {
        this.noJobs();
      }
    } else {
      this._clearDetails();
    }
  }

  /**
   * Clear the details
   */
  private _clearDetails(): void {
    this._treeDataProvider.setTreeData(null);
    this._treeView.title = 'Active Runs';
    this._treeDataProvider.refresh();
  }

  /**
   * Clear the details when theres no jobs
   */
  private noJobs(): void {
    this._treeDataProvider.setTreeData(null);
    this._treeDataProvider.refresh();
  }
}
