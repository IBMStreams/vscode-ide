import * as vscode from 'vscode';

// On macOS the passwords are managed by the Keychain,
// on Linux they are managed by the Secret Service API/libsecret,
// and on Windows they are managed by Credential Vault

// keytar depends on a native module shipped in VS Code, so this is how we load it
import * as keytarType from 'keytar';

/**
 * Get the Node module from the VS Code application root folder
 * @param moduleName The module name
 */
function getNodeModule<T>(moduleName: string): T | undefined {
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

type Keytar = {
    getPassword: typeof keytarType['getPassword'];
    setPassword: typeof keytarType['setPassword'];
    deletePassword: typeof keytarType['deletePassword'];
    findCredentials: typeof keytarType['findCredentials'];
};

const failingKeytar: Keytar = {
    async getPassword(service, account) { throw new Error('System keychain unavailable'); },
    async setPassword(service, account, password) { throw new Error('System keychain unavailable'); },
    async deletePassword(service, account) { throw new Error('System keychain unavailable'); },
    async findCredentials(service) { throw new Error('System keychain unavailable'); }
};

const systemKeychain = getNodeModule<Keytar>('keytar') || failingKeytar;

const SERVICE_ID = 'ibm-icp4d-streams';

export class Keychain {
    /**
     * Get the stored credentials from the keychain
     * @param username    The username
     */
    public static getCredentials = async (username: string): Promise<string> => {
        return systemKeychain!.getPassword(SERVICE_ID, username);
    }

    /**
     * Add a new set of credentials to the keychain
     * @param username    The username
     * @param password    The password
     */
    public static addCredentials = async (username: string, password: string): Promise<void> => {
        await systemKeychain!.setPassword(SERVICE_ID, username, password);
    }

    /**
     * Delete the stored credentials from the keychain
     * @param username    The username
     */
    public static deleteCredentials = async (username: string): Promise<void> => {
        await systemKeychain!.deletePassword(SERVICE_ID, username);
    }

    /**
     * Get all the stored credentials from the keychain
     */
    public static getAllCredentials = async (): Promise<Array<{ account: string, password: string}>> => {
        const creds = await systemKeychain!.findCredentials(SERVICE_ID);
        return creds;
    }

    /**
     * Delete all the stored credentials from the keychain
     */
    public static deleteAllCredentials = async (): Promise<void> => {
        const credentials = await Keychain.getAllCredentials();
        credentials.forEach((credential: { account: string, password: string }) => {
            Keychain.deleteCredentials(credential.account);
        });
    }

    /**
     * Check if credentials exist in the keychain
     */
    public static credentialsExist = async (): Promise<boolean> => {
        const credentials = await Keychain.getAllCredentials();
        return credentials.length > 0;
    }
}
