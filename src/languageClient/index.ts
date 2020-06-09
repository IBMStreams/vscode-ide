import { ToolkitUtils } from '@ibmstreams/common';
import * as childProcess from 'child_process';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { ExtensionContext, ProgressLocation, window, workspace } from 'vscode';
import {
    LanguageClient, LanguageClientOptions, ServerOptions, State, StreamInfo
} from 'vscode-languageclient';
import {
    Configuration, EXTENSION_ID, EXTENSION_NAME, LANGUAGE_SERVER, LANGUAGE_SPL, Logger, TOOLKITS_CACHE_DIR, Settings
} from '../utils';
import { checkUserPort } from './utils';

let client: LanguageClient = null;
let clientState: State = null;
let isClientReady = false;
let serverProcess: childProcess.ChildProcess = null;

/**
 * Language client that connects to the SPL LSP server
 */
export default class SplLanguageClient {
    private static _context: ExtensionContext;

    /**
     * Initialize the SPL language client and server
     * @param context    The extension context
     */
    public static async initialize(context: ExtensionContext): Promise<any> {
        this._context = context;
        await this.start();
    }

    /**
     * Restart the SPL language client and server
     */
    public static async restart(): Promise<any> {
        try {
            // Stop language server
            await this.cleanUp();

            // Start language server
            await this.start();
        } catch (err) {
            const errorMsg = `An error occurred while restarting the ${LANGUAGE_SERVER}.\n${err.toString()}`;
            Logger.error(null, errorMsg, false, true);
        }
    }

    /**
     * Start the SPL language client and server
     */
    public static async start(): Promise<any> {
        // Configure language server options
        let serverOptions: ServerOptions;
        let launcher: string;
        let command: string;
        const getCommand = (launcherPath: string): string => (os.platform() === 'win32' ? launcherPath : `./${launcherPath}`);
        const cwd = this._context.asAbsolutePath(path.join('node_modules', '@ibmstreams', 'spl-lsp', 'bin'));
        const processOptions = { cwd, shell: true, env: { ...process.env } };

        const mode = Configuration.getSetting(Settings.SERVER_MODE);
        let port: number;
        if (mode === Settings.SERVER_MODE_VALUE.EMBEDDED) {
            launcher = os.platform() === 'win32' ? 'startSplLspServer.bat' : 'startSplLspServer';
            command = getCommand(launcher);
            serverOptions = {
                run: { command, options: processOptions },
                debug: { command, options: processOptions }
            };
        } else {
            // Spawn a process for starting the language server in socket mode
            port = Configuration.getSetting(Settings.SERVER_PORT);

            // Check if the port is available
            port = await checkUserPort(port);
            if (!port) {
                return;
            }

            launcher = os.platform() === 'win32' ? 'startSplLspServerSocket.bat' : 'startSplLspServerSocket';
            command = getCommand(launcher);
            try {
                serverProcess = childProcess.spawn(
                    command,
                    [`port=${port}`],
                    { ...processOptions, windowsHide: true }
                );
                if (serverProcess.stderr) {
                    serverProcess.stderr.on('data', (data) => {
                        if (data) {
                            const errorMsg = 'An error occurred while starting the SPL language server in socket mode.\n';
                            Logger.error(null, `${errorMsg}${data.toString()}`, false, true);
                        }
                    });
                }
                serverProcess.on('error', (err) => {
                    if (err) {
                        const errorMsg = 'Failed to start the SPL language server in socket mode. ';
                        Logger.error(null, `${errorMsg}${err.toString()}`, true, true);
                    }
                });
                serverProcess.on('close', (code) => {
                    Logger.debug(null, `The SPL language server child process exited with code ${code}.`, false, false);
                });
            } catch (err) {
                const errorMsg = 'Failed to start the SPL language server in socket mode.';
                Logger.error(null, `${errorMsg} ${err.toString()}`, true, true);
            }

            const connectionInfo = { port };
            serverOptions = (): Promise<StreamInfo> => {
                // Connect to the language server via socket
                const socket = net.connect(connectionInfo);
                const result: StreamInfo = {
                    writer: socket,
                    reader: socket
                };
                return Promise.resolve(result);
            };
        }
        // Configure language client options
        const toolkitsOption = ToolkitUtils.getLangServerOptionForInitToolkits(TOOLKITS_CACHE_DIR, Configuration.getSetting(Settings.ENV_TOOLKIT_PATHS));
        const clientOptions: LanguageClientOptions = {
            outputChannel: Logger.languageServerOutputChannel,
            documentSelector: [{ scheme: 'file', language: LANGUAGE_SPL }],
            synchronize: { fileEvents: workspace.createFileSystemWatcher('**/*.*') },
            initializationOptions: () => toolkitsOption,
            initializationFailedHandler: (err) => {
                if (err) {
                    Logger.languageServerOutputChannel.appendLine(err.toString());
                }
                Logger.error(null, `Failed to initialize the ${LANGUAGE_SERVER}.`, true, true);
                return false;
            }
        };

        // Create the language client and start it
        client = new LanguageClient(EXTENSION_ID, EXTENSION_NAME, serverOptions, clientOptions);

        // Show progress in the status bar
        const progress = window.withProgress({
            location: ProgressLocation.Window,
            title: 'Initializing SPL language features'
        }, () => new Promise((resolve, reject) => {
            client.onReady().then(
                () => {
                    isClientReady = true;
                    resolve();
                },
                (err) => {
                    const errorMsg = 'An error occurred while initializing SPL language features.';
                    Logger.error(null, errorMsg, true, true);
                    isClientReady = false;
                    reject();
                }
            );
        }));

        // Monitor language client state
        client.onDidChangeState((event) => {
            const { newState } = event;
            clientState = newState;
            let status: string;
            switch (newState) {
                case State.Stopped:
                    status = 'has stopped';
                    break;
                case State.Starting:
                    status = `is starting${port ? ` on port ${port}` : ''}`;
                    break;
                case State.Running:
                    status = `is running${port ? ` on port ${port}` : ''}`;
                    break;
                default:
                    break;
            }
            Logger.debug(null, `The ${LANGUAGE_SERVER} ${status}.`, false, false);
        });

        // Start the client (and launch the server)
        if (mode === Settings.SERVER_MODE_VALUE.SOCKET) {
            // Allow time for the server process to start
            setTimeout(() => {
                client.start();
            }, 5000);
        } else {
            client.start();
            this._checkClientReady();
        }

        return progress;
    }

    /**
     * Clean up the SPL language server and client
     */
    public static cleanUp(): Promise<void> {
        if (!client) {
            return Promise.resolve();
        }

        // Kill child server process
        if (serverProcess) {
            serverProcess.kill();
            serverProcess = null;
        }

        // Stop the client
        if (clientState && clientState !== State.Stopped) {
            client.stop();
            client = null;
            clientState = null;
            isClientReady = false;
        }
        return Promise.resolve();
    }

    public static getClient(): LanguageClient {
        return client;
    }

    public static createDebugEnv(): any {
        return { JAVA_OPTS: '-Xdebug -Xrunjdwp:transport=dt_socket,address=8998,server=n,suspend=y', ...process.env };
    }

    private static _checkClientReady(): void {
        // If client is not ready within 60 seconds, then ask the user if they want to switch to socket mode
        setTimeout(async () => {
            if (!isClientReady) {
                const result = await window.showWarningMessage(
                    'The SPL language server is taking a while to start. Do you want to try running the server in socket mode?',
                    ...['Yes', 'No']
                );
                if (result === 'Yes') {
                    await Configuration.setSetting(Settings.SERVER_MODE, Settings.SERVER_MODE_VALUE.SOCKET);
                }
            }
        }, 60000);
    }
}

/**
 * Wait for the SPL language client to be ready
 * @param callbackFn    The callback function to execute
 */
export function waitForLanguageClientReady(callbackFn: Function): void {
    if (isClientReady) {
        callbackFn();
    } else {
        // Try again in 2 seconds
        setTimeout(() => {
            waitForLanguageClientReady(callbackFn);
        }, 2000);
    }
}
