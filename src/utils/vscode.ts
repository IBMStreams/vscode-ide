import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  env,
  SaveDialogOptions,
  Uri,
  window,
  workspace,
  WorkspaceFolder
} from 'vscode';

const YES_LABEL = 'Yes';
const NO_LABEL = 'No';

/**
 * Copy text to the user's clipboard
 * @param value the value to copy to the clipboard
 */
async function copyToClipboard(value: string): Promise<void> {
  await env.clipboard.writeText(value);
}

/**
 * Show a confirmation dialog
 * @param label the question label
 * @param yesCallbackFn the callback to function to call when the user selects Yes
 */
async function showConfirmationDialog(
  label: string,
  yesCallbackFn: Function
): Promise<any> {
  const selection = await window.showQuickPick([YES_LABEL, NO_LABEL], {
    canPickMany: false,
    ignoreFocusOut: true,
    placeHolder: label
  });
  return selection && selection === YES_LABEL ? yesCallbackFn() : null;
}

/**
 * Show a save dialog
 * @param label the button label
 * @param defaultFilePath the default file path where the file should be saved
 * @param fileName the name of the file
 * @param filters a set of file filters that are used by the dialog
 */
async function showSaveDialog(
  label: string,
  defaultFilePath: string,
  fileName: string,
  filters: any
): Promise<any> {
  let defaultUri: Uri;
  if (defaultFilePath) {
    defaultUri = Uri.file(defaultFilePath);
  } else {
    // Default to the user's Downloads folder
    const downloadsFolderPath = path.join(os.homedir(), 'Downloads');
    if (fs.existsSync(downloadsFolderPath)) {
      defaultUri = Uri.file(path.join(downloadsFolderPath, fileName));
    } else {
      // Otherwise default to the user's home directory
      defaultUri = Uri.file(path.join(os.homedir(), fileName));
    }
  }
  const options: SaveDialogOptions = {
    defaultUri,
    ...(filters && { filters }),
    saveLabel: label
  };
  const uri = await window.showSaveDialog(options);
  return uri || null;
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
 * Sanitize a path
 * @param p the path
 */
function sanitizePath(p: string): string {
  // Force uppercase drive letters on Windows
  if (os.platform() === 'win32' && p && p[1] === ':') {
    return p[0].toUpperCase() + p.substr(1);
  }
  return p;
}

/**
 * VS Code utilities
 */
const VSCode = {
  addFoldersToWorkspace,
  copyToClipboard,
  getWorkspaceFolderPaths,
  isWorkspaceFolder,
  sanitizePath,
  showConfirmationDialog,
  showSaveDialog
};

export default VSCode;
