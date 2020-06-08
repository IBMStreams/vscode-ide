import * as net from 'net';
import { ConfigurationTarget, window } from 'vscode';
import { Configuration, Logger, Settings } from '../utils';

/**
 * Check if a TCP port is available
 * @param port    The port number
 */
export const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                // Port is not available
                resolve(false);
            } else {
                reject(err);
            }
        });

        server.once('listening', () => {
            // Port is available
            server.once('close', () => {
                resolve(true);
            });

            // Close the server
            server.close();
        });

        // Start a TCP server listening for connections
        server.listen(port, '127.0.0.1');
    });
};

/**
 * Handle the user-provided port. If the port is not available, then prompt the user for a new port.
 * Returns an available port or `null`.
 * @param port    The port number
 */
export const checkUserPort = async (port: number): Promise<number> => {
    try {
        const isAvailable = await isPortAvailable(port);
        if (!isAvailable) {
            const result = await window.showWarningMessage(
                `The SPL language server cannot be started on port ${port} because it is already in use. \
                Do you want to specify a different port number for this session or workspace?`,
                ...['Session', 'Workspace']
            );
            if (result) {
                const portInput = await window.showInputBox({
                    prompt: 'Specify a unique port number where the SPL language server will run',
                    placeHolder: Settings.SERVER_PORT_DEFAULT.toString(),
                    ignoreFocusOut: true
                });
                if (portInput) {
                    const portInputNum = parseInt(portInput);
                    if (result === 'Session') {
                        // Re-check
                        return checkUserPort(portInputNum);
                    } else if (result === 'Workspace') {
                        if (Configuration.getSetting(Settings.SERVER_PORT) === portInputNum) {
                            // Re-check
                            return checkUserPort(portInputNum);
                        }
                        // Port in use re-check will happen automatically
                        await Configuration.setSetting(Settings.SERVER_PORT, portInputNum, ConfigurationTarget.Workspace);
                        return null;
                    }
                }
            }
        }
        return port;
    } catch (err) {
        Logger.error(null, `An error occurred while checking if port ${port} is available. ${err.message}`, false, true);
        // Attempt to use the port
        return port;
    }
};
