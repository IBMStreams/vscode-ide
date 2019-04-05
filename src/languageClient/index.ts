import * as os from 'os';
import * as path from 'path';
import { ExtensionContext, ProgressLocation, window, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';
import { StreamsToolkitsUtils } from '../build/v5/util';
import { Configuration, Constants, Settings } from '../utils';

/**
 * Language client that connects to the SPL LSP server
 */
export default class SplLanguageClient {
    private static client: LanguageClient;

    /**
     * Create and start a language client
     * @param context    The extension context
     */
    public static async create(context: ExtensionContext): Promise<LanguageClient> {
        // Set up language server and client options
        const launcher = os.platform() === 'win32' ? 'startSplLspServer.bat' : 'startSplLspServer';
        const command = os.platform() === 'win32' ? launcher : `./${launcher}`;
        const cwd = context.asAbsolutePath(path.join('node_modules', '@ibmstreams', 'spl-lsp', 'bin'));

        const serverOptions: ServerOptions = {
            run: { command, options: { cwd } },
            debug: { command, args: ['-Xdebug', '-Xrunjdwp:transport=dt_socket,address=8998,server=y,suspend=n'], options: { cwd } }
        };

        const toolkitsOption = StreamsToolkitsUtils.getLangServerOptionForInitToolkits(Constants.TOOLKITS_CACHE_DIR, Configuration.getSetting(Settings.TOOLKITS_PATH));
        const initOptions = { ...toolkitsOption };
        const clientOptions: LanguageClientOptions = {
            outputChannelName: 'IBM Streams SPL Language Server',
            documentSelector: [{ scheme: 'file', language: 'spl' }],
            synchronize: {
                fileEvents: workspace.createFileSystemWatcher('**/*.*')
            },
            initializationOptions: () => initOptions
        };

        // Create the language client and start the client
        const client = new LanguageClient('spl', Constants.IBM_STREAMS, serverOptions, clientOptions);
        this.client = client;

        // Show progress in the status bar
        window.withProgress({
            location: ProgressLocation.Window,
            title: 'Initializing SPL language features'
        }, () => new Promise((resolve, reject) => {
            client.onReady().then(
                () => resolve(),
                () => reject()
            );
        }));

        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        context.subscriptions.push(client.start());

        return client;
    }

    public static getClient(): LanguageClient {
        return this.client;
    }
}
