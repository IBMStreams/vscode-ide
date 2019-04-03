import * as os from 'os';
import * as path from 'path';
import { ExtensionContext, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';
import StreamsToolkitsUtils from '../build/v5/util/streams-toolkits-utils';
import { Constants, Settings, SplConfig } from '../utils';

export class SplLanguageClient {
    private static _client: LanguageClient;

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

        const toolkitsOption = StreamsToolkitsUtils.getLangServerOptionForInitToolkits(Constants.TOOLKITS_CACHE_DIR, SplConfig.getSetting(Settings.TOOLKITS_PATH));
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
        const client = new LanguageClient('spl', 'IBM Streams', serverOptions, clientOptions);
        this._client = client;

        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        context.subscriptions.push(client.start());

        return client;
    }

    public static getClient(): LanguageClient {
        return this._client;
    }
}
