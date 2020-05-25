import { window } from 'vscode';

const YES_LABEL = 'Yes';
const NO_LABEL = 'No';

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
 * VS Code utilities
 */
const VSCode = { showConfirmationDialog };

export default VSCode;
