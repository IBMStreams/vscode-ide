import {
  CloudPakForDataJobType,
  InstanceSelector,
  Registry,
  store,
  StreamsInstanceType
} from '@ibmstreams/common';
import * as semver from 'semver';
import { Event, EventEmitter, TreeDataProvider, TreeItem } from 'vscode';
import { Commands } from '../../../commands';
import { Streams } from '../../../streams';
import { Logger } from '../../../utils';
import {
  BaseImageTreeItem,
  BuildPoolTreeItem,
  CpdJobTreeItem,
  CpdJobRunTreeItem,
  CpdJobRunLogTreeItem,
  CpdProjectTreeItem,
  CpdSpaceTreeItem,
  InfoTreeItem,
  InstanceTreeItem,
  JobGroupTreeItem,
  JobTreeItem,
  LabelTreeItem,
  StreamsTreeItem,
  TreeItemType
} from './treeItems';

/**
 * A tree data provider that provides instance data
 */
export default class InstancesProvider
  implements TreeDataProvider<StreamsTreeItem> {
  private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
  public readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData
    .event;
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
      const reduxInstance = InstanceSelector.selectInstance(
        store.getState(),
        connectionId
      );
      if (reduxInstance) {
        ({
          streamsInstance,
          streamsJobGroups,
          streamsJobs,
          buildService
        } = reduxInstance);
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
        return new InstanceTreeItem(this._extensionPath, storedInstance, [
          infoTreeItem
        ]);
      }

      let jobsLabelTreeItem = this._getJobsTreeItem(
        reduxInstance,
        streamsJobGroups,
        streamsJobs
      );
      if (jobsLabelTreeItem && !Array.isArray(jobsLabelTreeItem)) {
        jobsLabelTreeItem = [jobsLabelTreeItem];
      }
      const buildServiceLabelTreeItem = this._getBuildServiceTreeItem(
        reduxInstance,
        buildService
      );

      // Generate root instance item
      return new InstanceTreeItem(this._extensionPath, reduxInstance, [
        ...(jobsLabelTreeItem || []),
        ...((buildServiceLabelTreeItem && [buildServiceLabelTreeItem]) || [])
      ]);
    });
    return treeItems;
  }

  /**
   * Get jobs tree item
   *
   * CPD 3.5 (Streams 5.5) and above:
   * ```plaintext
   * ▼ instance-1
   *   ▼ default-space                                           [has format {instance_name}.{instance_namespace}]
   *     ▼ job-1
   *       ▼ job-run-3                                           [sorted in descending order (newest => oldest)]
   *         ▼ Logs
   *             Application trace  12/1/2020, 12:00:00 PM       [sorted in descending order (newest => oldest)]
   *             Product log  12/1/2020, 11:59:59 PM
   *             Application trace  12/1/2020, 11:55:00 PM
   *             Product log  12/1/2020, 11:54:59 PM
   *         job-run-2                                           [if there are no job run logs, the job run node is not expandable]
   *       ▶ job-run-1
   *       job-2                                                 [if there are no job runs, the job node is not expandable]
   *     ▶ job-3
   *   ▶ space-1
   *   ▶ space-2
   *   ▶ Build service
   * ▶ instance-2
   * ▶ instance-3
   * ```
   *
   * All other versions:
   * ```plaintext
   * ▼ instance-1
   *   ▼ Jobs
   *     ▼ default-job-group    [name is 'default']
   *         job-1              [sorted in ascending order (oldest => newest)]
   *         job-2
   *         job-3
   *       job-group-2          [if there are no jobs, the job group node is not expandable]
   *     ▶ job-group-3
   *   ▶ Build service
   * ▶ instance-2
   * ▶ instance-3
   * ```
   */
  private _getJobsTreeItem(
    reduxInstance: any,
    streamsJobGroups: any,
    streamsJobs: any
  ): any {
    try {
      const { connectionId } = reduxInstance;

      // Check if we should use new CPD job format
      const instanceType = InstanceSelector.selectInstanceType(
        store.getState(),
        connectionId
      );
      const streamsVersion = InstanceSelector.selectStreamsVersion(
        store.getState(),
        connectionId,
        true
      );
      if (
        instanceType === StreamsInstanceType.V5_CPD &&
        streamsVersion &&
        semver.gte(streamsVersion, '5.5.0')
      ) {
        // Generate Cloud Pak for Data space items
        const cpdSpaces = InstanceSelector.selectCloudPakForDataSpacesOrProjects(
          store.getState(),
          connectionId,
          CloudPakForDataJobType.Space
        );
        let cpdSpaceTreeItems: CpdSpaceTreeItem[] = [];
        if (cpdSpaces && cpdSpaces.length) {
          cpdSpaceTreeItems = cpdSpaces.map(
            (cpdSpace: any): CpdSpaceTreeItem => {
              const {
                entity: { name: cpdSpaceName },
                jobs: cpdJobs
              } = cpdSpace;
              const cpdJobTreeItems = this.getCpdJobTreeItems(
                connectionId,
                reduxInstance,
                cpdSpace,
                null,
                cpdJobs
              );
              return new CpdSpaceTreeItem(
                this._extensionPath,
                cpdSpaceName,
                cpdSpace,
                reduxInstance,
                cpdJobTreeItems
              );
            }
          );
        }

        // Generate Cloud Pak for Data project items
        const cpdProjects = InstanceSelector.selectCloudPakForDataSpacesOrProjects(
          store.getState(),
          connectionId,
          CloudPakForDataJobType.Project
        );
        let cpdProjectTreeItems: CpdProjectTreeItem[] = [];
        if (cpdProjects && cpdProjects.length) {
          cpdProjectTreeItems = cpdProjects
            .slice()
            .sort((p1, p2) => p1.entity.name.localeCompare(p2.entity.name))
            .map(
              (cpdProject: any): CpdProjectTreeItem => {
                const {
                  entity: { name: cpdProjectName },
                  jobs: cpdJobs
                } = cpdProject;
                const cpdJobTreeItems = this.getCpdJobTreeItems(
                  connectionId,
                  reduxInstance,
                  null,
                  cpdProject,
                  cpdJobs
                );
                return cpdJobTreeItems.length
                  ? new CpdProjectTreeItem(
                      this._extensionPath,
                      cpdProjectName,
                      cpdProject,
                      reduxInstance,
                      cpdJobTreeItems
                    )
                  : null;
              }
            );
        }

        return [...cpdSpaceTreeItems, ...cpdProjectTreeItems];
      } else {
        // Generate grandchild job items grouped by job group
        const jobGroupMap = new Map();
        if (streamsJobs && streamsJobs.length) {
          streamsJobs.forEach((job: any): void => {
            const jobGroup = job.jobGroup.split('/').pop();
            if (!jobGroupMap.has(jobGroup)) {
              jobGroupMap.set(jobGroup, []);
            }
            const jobsInGroup = jobGroupMap.get(jobGroup);
            jobsInGroup.push(
              new JobTreeItem(this._extensionPath, job, reduxInstance)
            );
            jobGroupMap.set(jobGroup, jobsInGroup);
          });
        } else {
          const infoTreeItem = new InfoTreeItem(
            this._extensionPath,
            'There are no jobs available.',
            null,
            null,
            reduxInstance
          );
          return new LabelTreeItem(
            'Jobs',
            null,
            null,
            [infoTreeItem],
            reduxInstance
          );
        }

        // Generate child job group items
        let jobGroupTreeItems: JobGroupTreeItem[] = [];
        if (streamsJobGroups && streamsJobGroups.length) {
          jobGroupTreeItems = streamsJobGroups.map(
            (jobGroup: any): JobGroupTreeItem => {
              const { name } = jobGroup;
              let jobsInGroup = null;
              if (jobGroupMap.has(name)) {
                jobsInGroup = jobGroupMap.get(name);
              }
              return new JobGroupTreeItem(
                this._extensionPath,
                name,
                jobsInGroup,
                reduxInstance
              );
            }
          );
        }

        return new LabelTreeItem(
          'Jobs',
          null,
          null,
          jobGroupTreeItems,
          reduxInstance
        );
      }
    } catch (err) {
      Registry.getDefaultMessageHandler().logError(
        `An error occurred while generating the jobs tree item for the instance with connection ID: ${reduxInstance.connectionId}.`
      );
      return null;
    }
  }

  /**
   * Get Cloud Pak for Data job tree items
   * @param connectionId the target Streams instance connection identifier
   * @param reduxInstance the Streams instance stored in the Redux state
   * @param cpdSpace the Cloud Pak for Data space
   * @param cpdProject the Cloud Pak for Data project
   * @param cpdJobs the Cloud Pak for Data job definitions
   */
  private getCpdJobTreeItems(
    connectionId: string,
    reduxInstance: any,
    cpdSpace: any,
    cpdProject: any,
    cpdJobs: any[]
  ): CpdJobTreeItem[] | InfoTreeItem[] {
    let cpdJobTreeItems: CpdJobTreeItem[] = [];
    if (cpdJobs && cpdJobs.length) {
      cpdJobTreeItems = cpdJobs.map(
        (cpdJob: any): CpdJobTreeItem => {
          const {
            metadata: { name: cpdJobName },
            runs: cpdJobRuns
          } = cpdJob;
          // Generate Cloud Pak for Data job run items
          let cpdJobRunTreeItems: CpdJobRunTreeItem[];
          if (cpdJobRuns && cpdJobRuns.length) {
            cpdJobRunTreeItems = cpdJobRuns.map(
              (cpdJobRun: any): CpdJobRunTreeItem => {
                const {
                  metadata: { name: cpdJobRunName },
                  logs: cpdJobRunLogs
                } = cpdJobRun;
                // Generate Cloud Pak for Data job run log items
                let logsLabelTreeItem: LabelTreeItem;
                let cpdJobRunLogTreeItems: CpdJobRunLogTreeItem[];
                if (cpdJobRunLogs && cpdJobRunLogs.length) {
                  cpdJobRunLogTreeItems = cpdJobRunLogs
                    .slice()
                    .sort(
                      (
                        {
                          last_modified: firstRunLastModified
                        }: { last_modified: string },
                        {
                          last_modified: secondRunLastModified
                        }: { last_modified: string }
                      ) =>
                        new Date(secondRunLastModified).getTime() -
                        new Date(firstRunLastModified).getTime()
                    )
                    .map(
                      (cpdJobRunLog: any): CpdJobRunLogTreeItem => {
                        const { path } = cpdJobRunLog;
                        return new CpdJobRunLogTreeItem(
                          this._extensionPath,
                          path,
                          cpdJobRunLog,
                          cpdJobRun,
                          cpdJob,
                          cpdSpace,
                          cpdProject,
                          reduxInstance
                        );
                      }
                    );
                  logsLabelTreeItem = new LabelTreeItem(
                    'Logs',
                    {
                      connectionId,
                      spaceId: cpdSpace?.metadata?.id,
                      projectId: cpdProject?.metadata?.guid,
                      jobId: cpdJob.metadata.asset_id,
                      jobName: cpdJobName,
                      jobRunId: cpdJobRun.metadata.asset_id,
                      jobRunName: cpdJobRunName
                    },
                    TreeItemType.CpdJobRunLogsLabel,
                    cpdJobRunLogTreeItems,
                    reduxInstance
                  );
                }
                return new CpdJobRunTreeItem(
                  this._extensionPath,
                  cpdJobRunName,
                  cpdJobRun,
                  cpdJob,
                  cpdSpace,
                  cpdProject,
                  reduxInstance,
                  logsLabelTreeItem ? [logsLabelTreeItem] : null
                );
              }
            );
          }
          return new CpdJobTreeItem(
            this._extensionPath,
            cpdJobName,
            cpdJob,
            cpdSpace,
            cpdProject,
            reduxInstance,
            cpdJobRunTreeItems
          );
        }
      );
    }
    return cpdJobTreeItems;
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
        const buildPools = InstanceSelector.selectBuildPools(
          store.getState(),
          connectionId
        );
        if (buildPools && buildPools.length) {
          const buildPoolLabelTreeItems = buildPools.map((buildPool: any) => {
            let baseImagesLabelTreeItem = null;
            // Generate base images tree items
            if (buildPool.type === 'image') {
              const baseImages = InstanceSelector.selectBaseImages(
                store.getState(),
                connectionId
              );
              const imageBuildChildren =
                baseImages && baseImages.length
                  ? baseImages.map(
                      (baseImage: any) =>
                        new BaseImageTreeItem(
                          this._extensionPath,
                          baseImage,
                          reduxInstance
                        )
                    )
                  : null;
              baseImagesLabelTreeItem = imageBuildChildren
                ? new LabelTreeItem(
                    'Base images',
                    null,
                    null,
                    imageBuildChildren,
                    reduxInstance
                  )
                : null;
            }
            return new BuildPoolTreeItem(
              this._extensionPath,
              buildPool,
              baseImagesLabelTreeItem ? [baseImagesLabelTreeItem] : null,
              reduxInstance
            );
          });
          buildServiceChildren = [
            new LabelTreeItem(
              'Build pools',
              null,
              null,
              buildPoolLabelTreeItems,
              reduxInstance
            )
          ];
        } else {
          buildServiceChildren = [
            new InfoTreeItem(
              this._extensionPath,
              'There are no build pools available.',
              null,
              null,
              reduxInstance
            )
          ];
        }

        // Generate build service tree item
        const buildServiceProperties = InstanceSelector.selectBuildServiceProperties(
          store.getState(),
          connectionId
        );
        buildServiceLabelTreeItem = new LabelTreeItem(
          'Build service',
          buildServiceProperties,
          TreeItemType.BuildService,
          buildServiceChildren,
          reduxInstance
        );
      }
      return buildServiceLabelTreeItem;
    } catch (err) {
      Registry.getDefaultMessageHandler().logError(
        `An error occurred while generating the build service tree item for the instance with connection ID: ${connectionId}.`
      );
      return null;
    }
  }
}
