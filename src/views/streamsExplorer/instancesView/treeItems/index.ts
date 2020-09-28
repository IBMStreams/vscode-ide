import BaseImageTreeItem from './baseImageTreeItem';
import BuildPoolTreeItem from './buildPoolTreeItem';
import InfoTreeItem from './infoTreeItem';
import InstanceTreeItem from './instanceTreeItem';
import JobTreeItem from './jobTreeItem';
import JobGroupTreeItem from './jobGroupTreeItem';
import LabelTreeItem from './labelTreeItem';

export enum TreeItemType {
    BaseImage = 'baseImage',
    BuildPool = 'buildPool',
    BuildService = 'buildService',
    Info = 'info',
    Instance = 'instance',
    Job = 'job',
    JobGroup = 'jobGroup',
    Label = 'label'
};

export {
    BaseImageTreeItem,
    BuildPoolTreeItem,
    InfoTreeItem,
    InstanceTreeItem,
    JobGroupTreeItem,
    JobTreeItem,
    LabelTreeItem
};

export type StreamsTreeItem = BaseImageTreeItem
    | BuildPoolTreeItem
    | InfoTreeItem
    | InstanceTreeItem
    | JobGroupTreeItem
    | JobTreeItem
    | LabelTreeItem;
