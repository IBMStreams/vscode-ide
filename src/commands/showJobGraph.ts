import { Editor, EditorAction, generateRandomId, store } from '@ibmstreams/common';
import { ExtensionContext } from 'vscode';
import { BaseCommand, Commands } from '.';
import { Streams, StreamsInstance } from '../streams';
import { Authentication } from '../utils';
import { JobGraphWebviewPanel } from '../webviews';

/**
 * Command that shows the Streams job graph in a webview panel
 */
export default class ShowJobGraphCommand implements BaseCommand {
    public commandName: string = Commands.ENVIRONMENT.SHOW_JOB_GRAPH;

    /**
     * Execute the command
     * @param context    The extension context
     * @param args       Array of arguments
     */
    public execute(context: ExtensionContext, ...args: any[]): void {
        let properties = args[0][0] ? args[0][0] : null;
        const targetInstance = properties && properties.instance ? properties.instance : Streams.getDefaultInstance();
        if (targetInstance) {
            const showJobGraph = (): void => {
                const streamsProperties = Authentication.getProperties(targetInstance);
                properties = properties ? { ...properties, ...streamsProperties } : streamsProperties;
                JobGraphWebviewPanel.createOrShow(context, properties);
            };
            if (!Authentication.isAuthenticated(targetInstance)) {
                const queuedActionId = generateRandomId('queuedAction');
                store.dispatch(EditorAction.addQueuedAction({
                    id: queuedActionId,
                    action: Editor.executeCallbackFn(showJobGraph)
                }));
                StreamsInstance.authenticate(targetInstance, true, queuedActionId);
            } else {
                showJobGraph();
            }
        }
    }
}
