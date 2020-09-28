import * as path from 'path';
import {
    env, Uri, window, workspace, WorkspaceFolder
} from 'vscode';

const YES_LABEL = 'Yes';
const NO_LABEL = 'No';

/**
 * Copy text to the user's clipboard
 * @param value    The value to copy to the clipboard
 */
async function copyToClipboard(value: string): Promise<void> {
    await env.clipboard.writeText(value);
}

/**
 * Show a confirmation dialog
 * @param label            The question label
 * @param yesCallbackFn    The callback to function to call when the user selects Yes
 */
async function showConfirmationDialog(label: string, yesCallbackFn: Function): Promise<any> {
    const selection = await window.showQuickPick([YES_LABEL, NO_LABEL], {
        canPickMany: false,
        ignoreFocusOut: true,
        placeHolder: label
    });
    return (selection && selection === YES_LABEL)
        ? yesCallbackFn()
        : null;
}

/**
 * Get the workspace folder paths
 */
function getWorkspaceFolderPaths(): string[] {
    return workspace.workspaceFolders
        ? workspace.workspaceFolders.map(
            (folder: WorkspaceFolder) => folder.uri.fsPath
        )
        : [];
}

/**
 * Determine whether a folder or a folder above it is a workspace folder
 * @param folderPath the folder path to check
 */
function isWorkspaceFolder(folderPath: string): boolean {
    const rootFolderPath = path.parse(process.cwd()).root;
    const workspaceFolderPaths = getWorkspaceFolderPaths();
    const notWorkspaceFolder = (folderPath: string): boolean =>
        !workspaceFolderPaths.includes(folderPath);
    const notRootFolder = (folderPath: string): boolean =>
        folderPath !== rootFolderPath;
    // Traverse upwards from starting folder until we reach a workspace folder or the root folder
    let currentFolderPath = folderPath;
    while (
        notWorkspaceFolder(currentFolderPath) &&
        notRootFolder(currentFolderPath)
    ) {
        currentFolderPath = path.dirname(currentFolderPath);
    }
    // If we are not at the root folder, then it is a workspace folder
    return currentFolderPath !== rootFolderPath;
}

/**
 * Add one or more folders to the workspace
 * @param folderPaths the folder paths to add
 */
function addFoldersToWorkspace(folderPaths: string[]): void {
    const foldersToAdd = folderPaths
        .filter((folderPath) => !isWorkspaceFolder(folderPath))
        .map((folderPath) => ({ uri: Uri.file(folderPath) }));
    if (foldersToAdd.length) {
        workspace.updateWorkspaceFolders(
            workspace.workspaceFolders ? workspace.workspaceFolders.length : 0,
            null,
            ...foldersToAdd
        );
    }
}

/**
 * VS Code utilities
 */
const VSCode = {
    addFoldersToWorkspace,
    copyToClipboard,
    getWorkspaceFolderPaths,
    isWorkspaceFolder,
    showConfirmationDialog
};

export default VSCode;
