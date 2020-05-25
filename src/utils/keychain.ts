import * as vscode from 'vscode';

// On macOS the passwords are managed by the Keychain,
// on Linux they are managed by the Secret Service API/libsecret,
// and on Windows they are managed by Credential Vault

/**
 * Get the Node module from the VS Code application root folder
 * @param moduleName The module name
 */
function getNodeModule<T>(moduleName: string): T | undefined {
    // eslint-disable-next-line no-eval
    const vscodeRequire = eval('require');
    try {
        return vscodeRequire(`${vscode.env.appRoot}/node_modules.asar/${moduleName}`);
    } catch (err) {
        // Not in ASAR
    }
    try {
        return vscodeRequire(`${vscode.env.appRoot}/node_modules/${moduleName}`);
    } catch (err) {
        // Not available
    }
    return undefined;
}

interface Keytar {
    getPassword: Function;
    setPassword: Function;
    deletePassword: Function;
    findCredentials: Function;
}

const failingKeytar: Keytar = {
    async getPassword(service, account) { throw new Error('System keychain unavailable'); },
    async setPassword(service, account, password) { throw new Error('System keychain unavailable'); },
    async deletePassword(service, account) { throw new Error('System keychain unavailable'); },
    async findCredentials(service) { throw new Error('System keychain unavailable'); }
};

const systemKeychain = getNodeModule<Keytar>('keytar') || failingKeytar;

/**
 * Manages credentials in the system keychain
 */
export default class Keychain {
    /**
     * Get the stored credentials from the keychain
     * @param serviceName    The service name
     * @param username       The username
     */
    public static getCredentials = async (serviceName: string, username: string): Promise<string> => {
        if (systemKeychain) {
            return systemKeychain.getPassword(serviceName, username);
        }
        return null;
    }

    /**
     * Add a new set of credentials to the keychain
     * @param serviceName    The service name
     * @param username       The username
     * @param password       The password
     */
    public static addCredentials = async (serviceName: string, username: string, password: string): Promise<void> => {
        if (systemKeychain) {
            await systemKeychain.setPassword(serviceName, username, password);
        }
    }

    /**
     * Delete the stored credentials from the keychain
     * @param serviceName    The service name
     * @param username       The username
     */
    public static deleteCredentials = async (serviceName: string, username: string): Promise<boolean> => {
        if (systemKeychain) {
            return systemKeychain.deletePassword(serviceName, username);
        }
        return null;
    }

    /**
     * Get all the stored credentials from the keychain
     * @param serviceName    The service name
     */
    public static getAllCredentials = async (serviceName: string): Promise<{ account: string, password: string}[]> => {
        if (systemKeychain && systemKeychain.findCredentials) {
            const creds = await systemKeychain.findCredentials(serviceName);
            return creds;
        }
        return null;
    }

    /**
     * Delete all the stored credentials from the keychain
     * @param serviceName    The service name
     */
    public static deleteAllCredentials = async (serviceName: string): Promise<void> => {
        const credentials = await Keychain.getAllCredentials(serviceName);
        if (credentials) {
            credentials.forEach((credential: { account: string, password: string }) => {
                Keychain.deleteCredentials(serviceName, credential.account);
            });
        }
    }
}
