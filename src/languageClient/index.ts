'use strict';

import * as path from 'path';
import * as os from 'os';

import { workspace, ExtensionContext } from 'vscode';
import { Trace } from 'vscode-jsonrpc';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';

import { SplConfig } from '../utils';

export class SplLanguageClient {
    /**
     * Create and start a language client
     * @param context    The extension context
     */
    public static create(context: ExtensionContext): LanguageClient {
        // Set up language server and client options
        const launcher = os.platform() === 'win32' ? 'startSplLspServer.bat' : 'startSplLspServer';
        const command = os.platform() === 'win32' ? launcher : `./${launcher}`;
        const cwd = context.asAbsolutePath(path.join('node_modules', '@ibmstreams', 'spl-lsp', 'bin'));

        const serverOptions: ServerOptions = {
            run: { command: command, options: { cwd: cwd } },
            debug: { command: command, args: ['-Xdebug', '-Xrunjdwp:transport=dt_socket,address=8998,server=y,suspend=n'], options: { cwd: cwd } }
        };

        const clientOptions: LanguageClientOptions = {
            outputChannelName: 'IBM Streams SPL Language Server',
            documentSelector: [{ scheme: 'file', language: 'spl' }],
            synchronize: {
                fileEvents: workspace.createFileSystemWatcher('**/*.*')
            },
            initializationOptions: () => ({ settings: SplConfig.getCurrentSettings() })
        };

        // Create the language client and start the client
        const client = new LanguageClient('spl', 'IBM Streams', serverOptions, clientOptions);

        // Enable tracing
        client.trace = Trace.Verbose;

        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        context.subscriptions.push(client.start());

        return client;
    }
}
