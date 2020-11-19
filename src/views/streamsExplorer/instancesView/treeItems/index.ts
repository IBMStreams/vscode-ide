import BaseImageTreeItem from './baseImageTreeItem';
import BuildPoolTreeItem from './buildPoolTreeItem';
import CpdJobTreeItem from './cpdJobTreeItem';
import CpdJobRunTreeItem from './cpdJobRunTreeItem';
import CpdJobRunLogTreeItem from './cpdJobRunLogTreeItem';
import CpdProjectTreeItem from './cpdProjectTreeItem';
import CpdSpaceTreeItem from './cpdSpaceTreeItem';
import InfoTreeItem from './infoTreeItem';
import InstanceTreeItem from './instanceTreeItem';
import JobTreeItem from './jobTreeItem';
import JobGroupTreeItem from './jobGroupTreeItem';
import LabelTreeItem from './labelTreeItem';

export enum TreeItemType {
  BaseImage = 'baseImage',
  BuildPool = 'buildPool',
  BuildService = 'buildService',
  CpdJob = 'cpdJob',
  CpdJobRun = 'cpdJobRun',
  CpdJobRunLog = 'cpdJobRunLog',
  CpdJobRunLogsLabel = 'cpdJobRunLogsLabel',
  CpdProject = 'cpdProject',
  CpdSpace = 'cpdSpace',
  Info = 'info',
  Instance = 'instance',
  Job = 'job',
  JobGroup = 'jobGroup',
  Label = 'label'
}

export {
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
  LabelTreeItem
};

export type StreamsTreeItem =
  | BaseImageTreeItem
  | BuildPoolTreeItem
  | CpdJobTreeItem
  | CpdJobRunTreeItem
  | CpdJobRunLogTreeItem
  | CpdProjectTreeItem
  | CpdSpaceTreeItem
  | InfoTreeItem
  | InstanceTreeItem
  | JobGroupTreeItem
  | JobTreeItem
  | LabelTreeItem;
