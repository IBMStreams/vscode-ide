import { InstanceSelector, store } from '@ibmstreams/common';
import * as path from 'path';
import { Event, EventEmitter, TreeDataProvider, TreeItem } from 'vscode';
import { BuiltInCommands, Views } from '../../../utils';
import { TreeItemType } from '../instancesView/treeItems';
import JobsTreeItem from './streamsJobsTreeItem';

/**
 * A tree data provider that provides running job data
 */
export class JobsProvider implements TreeDataProvider<JobsTreeItem> {
  private _extensionPath: string;
  private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
  public readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData
    .event;
  private _defaultTreeData = null;
  private _treeData: any;

  constructor(extensionPath: string) {
    this._extensionPath = extensionPath;
    this._treeData = null;
    this._defaultTreeData = {
      label:
        'Select an item containing active runs in the Instances view to display them.',
      iconPath: {
        light: path.join(
          this._extensionPath,
          'images',
          'icons',
          'light',
          'information.svg'
        ),
        dark: path.join(
          this._extensionPath,
          'images',
          'icons',
          'dark',
          'information.svg'
        )
      },
      command: {
        title: '',
        command: `${Views.StreamsInstances}.${BuiltInCommands.ShowView}`,
        arguments: null
      }
    };
  }

  public getChildren(element?: JobsTreeItem): JobsTreeItem[] {
    return element
      ? element.children
      : this._treeData || [this._defaultTreeData];
  }

  public getTreeItem(element: JobsTreeItem): TreeItem {
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
   * Set tree data
   * @param data the tree data
   */
  public setTreeData(data: any): void {
    this._treeData = data;
  }

  /**
   * Generate tree data
   * @param element the element
   * @param properties the element properties to display
   */
  public generateTreeData(
    element: any,
    instance: any,
    space: any,
    project: any,
    type: any
  ): JobsTreeItem[] {
    if (!element) {
      return;
    }

    const reduxInstance = InstanceSelector.selectInstance(
      store.getState(),
      instance.connectionId
    );

    const dataArray = [];
    let tempData = null;

    if (
      type !== TreeItemType.CpdJob &&
      type !== TreeItemType.CpdJobRun &&
      type !== TreeItemType.CpdJobRunLog
    ) {
      const elements = Object.entries(element);
      elements.forEach((item: any) => {
        tempData = item[1].runs.map((run: any) => {
          const { formatFn } = run;
          const propertyValue = run.metadata.name;
          if (run.streamsJob && run.streamsJob.status === 'running') {
            return new JobsTreeItem(
              this._extensionPath,
              formatFn
                ? formatFn(propertyValue)
                : this.getStringValue(propertyValue),
              run,
              item[1],
              space,
              project,
              reduxInstance,
              null
            );
          }
        });
        dataArray.push(...tempData);
      });
    } else {
      tempData = element.runs.map((run: any) => {
        const { formatFn } = run;
        const propertyValue = run.metadata.name;
        if (run.streamsJob && run.streamsJob.status === 'running') {
          return new JobsTreeItem(
            this._extensionPath,
            formatFn
              ? formatFn(propertyValue)
              : this.getStringValue(propertyValue),
            run,
            element,
            space,
            project,
            reduxInstance
          );
        }
      });
      dataArray.push(...tempData);
    }

    const filtered = dataArray.filter(function (el) {
      return el != null;
    });
    if (filtered.length !== 0) {
      this._treeData = dataArray;
      this.refresh();
    } else {
      this._treeData = null;
      this.refresh();
    }
  }

  /**
   * Get the string-ified version of a value
   * @param value the value
   */
  private getStringValue(value: any): string {
    if (value === null) {
      return '';
    }
    if (value.toString) {
      return value.toString();
    }
    return value;
  }
}
