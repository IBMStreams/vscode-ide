import {
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, window
} from 'vscode';
import { BuiltInCommands, Views } from '../../utils';

const resourceLinks = {
    'Getting started': {
        'Using the IBM Streams extension for Visual Studio Code': 'http://ibmstreams.github.io/streamsx.documentation/docs/spl/quick-start/qs-1b/',
        'New to IBM Streams': 'https://developer.ibm.com/streamsdev/new-to-streams',
        Tutorials: 'https://ibmstreams.github.io/tutorials',
        Toolkits: 'https://developer.ibm.com/streamsdev/docs/github-projects-overview',
        Samples: {
            'Samples catalog': 'https://ibmstreams.github.io/samples',
            'Sample Python notebooks': 'https://github.com/IBMStreams/sample.starter_notebooks'
        }
    },
    'Product documentation': {
        'Documentation homepage': 'http://ibmstreams.github.io/streamsx.documentation/index.html',
        'IBM Streams documentation in IBM Knowledge Center': 'https://www.ibm.com/support/knowledgecenter/SSCRJU/SSCRJU_welcome.html',
        'IBM Streams in IBM Cloud Pak for Data': 'https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/cpd/svc/streams/developing-intro.html',
        'IBM Streaming Analytics on IBM Cloud': 'https://cloud.ibm.com/docs/services/StreamingAnalytics?topic=StreamingAnalytics-starterapps_deploy',
        'SPL toolkit API': 'http://ibmstreams.github.io/streamsx.topology/doc/spldoc/html/index.html',
        'Python application API': 'https://streamsxtopology.readthedocs.io/en/stable/index.html',
        'Java application API': 'http://ibmstreams.github.io/streamsx.topology/doc/javadoc/index.html'
    },
    Support: {
        'Support forum': 'https://www.ibm.com/mysupport/s/forumsproduct?language=en_US&name=Streams&id=0TO50000000IQN0GAO',
        'Stack Overflow': 'https://stackoverflow.com/questions/tagged/ibm-streams'
    },
    'Join the community': {
        'Developer community': 'http://ibm.biz/streams-community',
        'IBM Streams on GitHub': 'https://ibmstreams.github.io',
        'Follow us on Twitter': 'https://twitter.com/hashtag/IBMStreams?src=hash'
    }
};

/**
 * Represents the Helpful Resources view
 */
export default class HelpfulResourcesView {
    constructor() {
        window.createTreeView(Views.StreamsHelpfulResources, {
            treeDataProvider: new HelpfulResourcesProvider(),
            showCollapseAll: true
        });
    }
}

/**
 * Tree item that represents a helpful resource
 */
interface HelpfulResourceTreeItem {
    label: string;
    url?: string;
    children?: HelpfulResourceTreeItem[] | null;
}

/**
 * A tree data provider that provides helpful resource data
 */
class HelpfulResourcesProvider implements TreeDataProvider<HelpfulResourceTreeItem> {
    public getChildren(element?: HelpfulResourceTreeItem): HelpfulResourceTreeItem[] {
        return element ? element.children : this._createTreeItems(resourceLinks);
    }

    public getTreeItem(element: HelpfulResourceTreeItem): TreeItem {
        const { label, url, children } = element;
        let collapsibleState: TreeItemCollapsibleState;
        if (label === Object.keys(resourceLinks)[0]) {
            collapsibleState = TreeItemCollapsibleState.Expanded;
        } else {
            collapsibleState = children
                ? TreeItemCollapsibleState.Collapsed
                : TreeItemCollapsibleState.None;
        }
        return {
            label,
            collapsibleState,
            command: url
                ? {
                    title: '',
                    command: BuiltInCommands.Open,
                    arguments: [Uri.parse(url)]
                }
                : null
        };
    }

    /**
     * Creates tree items from input data
     * @param data    The data
     */
    private _createTreeItems(data: any): HelpfulResourceTreeItem[] {
        return Object.keys(data).map((label): any => {
            const value = data[label];
            return typeof value === 'string'
                ? {
                    label,
                    url: value
                }
                : {
                    label,
                    children: this._createTreeItems(value)
                };
        });
    }
}
