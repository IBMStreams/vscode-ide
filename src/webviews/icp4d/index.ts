import * as fs from 'fs';
import * as path from 'path';
import { Disposable, ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { authenticateIcp4d, setCurrentLoginStep, setFormDataField, setSelectedInstance } from '../../build/v5/actions';
import getStore from '../../build/v5/redux-store/configure-store';
import { StateSelector } from '../../build/v5/util';
import { Configuration, Constants } from '../../utils';
import { getNonce } from '../../webviews';

/**
 * Identifiers for messages between the extension and the webview
 */
const enum MessageId {
    AUTHENTICATE_ICP4D = 'authenticateIcp4d',
    CLOSE = 'close',
    CURRENT_STEP = 'currentStep',
    INIT_STEP1 = 'initStep1',
    PERSIST_AUTH = 'persistAuth',
    PREVIOUS_STEP = 'previousStep',
    REDUX_STATE_CHANGE = 'reduxStateChange',
    SET_INSTANCE = 'setInstance',
    UPDATE_FORM_DATA_FIELD = 'updateFormDataField'
}

/**
 * Manages webview panel for IBM Cloud Private for Data authentication
 */
export default class ICP4DWebviewPanel {
    private static currentPanel: ICP4DWebviewPanel | undefined;

    private static readonly viewType = 'icp4d';

    private readonly _panel: WebviewPanel;
    private readonly _context: ExtensionContext;
    private readonly _extensionPath: string;
    private _disposables: Disposable[] = [];

    /**
     * Create or show the webview
     * @param context    The extension context
     */
    public static createOrShow(context: ExtensionContext) {
        if (ICP4DWebviewPanel.currentPanel) {
            ICP4DWebviewPanel.currentPanel._panel.reveal(ViewColumn.Beside);
            return;
        }

        const panel = window.createWebviewPanel(ICP4DWebviewPanel.viewType, 'IBM Cloud Private for Data Settings', ViewColumn.Beside, {
            enableScripts: true,
            localResourceRoots: [ Uri.file(path.join(context.extensionPath, 'out')) ]
        });
        panel.iconPath = Uri.file(path.join(context.extensionPath, 'images', 'ibm-streaming-analytics.svg'));
        ICP4DWebviewPanel.currentPanel = new ICP4DWebviewPanel(panel, context);
    }

    /**
     * Close the webview if it exists
     */
    public static close() {
        if (ICP4DWebviewPanel.currentPanel) {
            ICP4DWebviewPanel.currentPanel._panel.dispose();
        }
    }

    /**
     * Close webview and and clean up resources
     */
    public dispose() {
        ICP4DWebviewPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }

        getStore().dispatch(setCurrentLoginStep(1));
    }

    /**
     * @param panel      The webview panel
     * @param context    The extension context
     */
    private constructor(
        panel: WebviewPanel,
        context: ExtensionContext
    ) {
        this._panel = panel;
        this._context = context;
        this._extensionPath = context.extensionPath;

        this._setHtml();

        this._receiveMessage(this._panel, this._disposables);
        const unsubscribe = this._reduxSubscribe(this._panel);

        this._panel.onDidDispose(
            () => {
                unsubscribe();
                this.dispose();
            },
            null,
            this._disposables
        );

        this._panel.onDidChangeViewState((e) => {
            if (this._panel.visible) {
                this._setHtml();
            }
        }, null, this._disposables);
    }

    /**
     * Set the HTML content for the webview
     */
    private _setHtml() {
        let content = fs.readFileSync(path.join(this._extensionPath, 'src', 'webviews', 'icp4d', 'resources', 'index.html'), 'utf8');

        const nonce = getNonce();
        content = content.replace(/{{nonce}}/g, nonce);

        const vendorScriptPathOnDisk = Uri.file(this._context.asAbsolutePath('out/vendor.js'));
        const vendorSriptUri = vendorScriptPathOnDisk.with({ scheme: 'vscode-resource' }).toString();
        content = content.replace('{{vendorScriptUri}}', vendorSriptUri);

        const mainScriptPathOnDisk = Uri.file(this._context.asAbsolutePath('out/icp4d.js'));
        const mainScriptUri = mainScriptPathOnDisk.with({ scheme: 'vscode-resource' }).toString();
        content = content.replace('{{mainScriptUri}}', mainScriptUri);

        this._panel.webview.html = content;
    }

    /**
     * Receive a message from the webview
     * @param panel          The webview panel
     * @param disposables    Disposable objects to clean up when the panel is disposed
     */
    private _receiveMessage(panel: WebviewPanel, disposables: Disposable[]): void {
        panel.webview.onDidReceiveMessage(({ id, value }: { id: string, value: any }) => {
            const state = getStore().getState();
            switch (id) {
                case MessageId.CURRENT_STEP:
                    this._sendMessage(panel, {
                        id: MessageId.CURRENT_STEP,
                        value: {
                            currentStep: StateSelector.getCurrentLoginStep(state) || 1
                        }
                    });
                    break;
                case MessageId.PREVIOUS_STEP:
                    const currentStep = StateSelector.getCurrentLoginStep(state);
                    getStore().dispatch(setCurrentLoginStep(currentStep - 1));
                    break;
                case MessageId.INIT_STEP1:
                    this._sendMessage(panel, {
                        id: MessageId.INIT_STEP1,
                        value: {
                            username: StateSelector.getFormUsername(state) || '',
                            password: StateSelector.getFormPassword(state) || '',
                            rememberPassword: StateSelector.getFormRememberPassword(state) || true
                        }
                    });
                    break;
                case MessageId.UPDATE_FORM_DATA_FIELD:
                    const { formKey, formValue } = value;
                    getStore().dispatch(setFormDataField(formKey, formValue));
                    break;
                case MessageId.AUTHENTICATE_ICP4D:
                    const { username, password, rememberPassword } = value;
                    getStore().dispatch(authenticateIcp4d(username, password, rememberPassword));
                    break;
                case MessageId.PERSIST_AUTH:
                    const formUsername = StateSelector.getUsername(state);
                    const formRememberPassword = StateSelector.getRememberPassword(state);
                    Configuration.setState(`${Constants.EXTENSION_NAME}.username`, formUsername);
                    Configuration.setState(`${Constants.EXTENSION_NAME}.rememberPassword`, formRememberPassword);
                    break;
                case MessageId.SET_INSTANCE:
                    const { instance } = value;
                    getStore().dispatch(setSelectedInstance(instance));
                    break;
                case MessageId.CLOSE:
                    ICP4DWebviewPanel.close();
                    break;
            }
        }, null, disposables);
    }

    /**
     * Send a message to the webview
     * @param panel      The webview panel
     * @param message    The JSON message to send
     */
    private _sendMessage(panel: WebviewPanel, message: { id: string, value: any }): void {
        panel.webview.postMessage(message);
    }

    /**
     * Subscribe to Redux state changes
     * @param panel    The webview panel
     */
    private _reduxSubscribe(panel: WebviewPanel): () => void {
        const unsubscribe = getStore().subscribe(() => {
            const state = getStore().getState();
            const rememberPassword = StateSelector.getFormRememberPassword(state);
            const hasAuthenticatedIcp4d = StateSelector.hasAuthenticatedIcp4d(state);
            const properties = {
                currentStep: StateSelector.getCurrentLoginStep(state) || 1,
                username: StateSelector.getFormUsername(state) || '',
                password: StateSelector.getFormPassword(state) || '',
                rememberPassword: typeof rememberPassword === 'boolean' ? rememberPassword : true,
                hasAuthenticatedIcp4d: typeof hasAuthenticatedIcp4d === 'boolean' ? hasAuthenticatedIcp4d : false,
                icp4dAuthError: null || StateSelector.getIcp4dAuthError(state),
                streamsInstances: null || StateSelector.getStreamsInstances(state),
                streamsAuthError: null || StateSelector.getStreamsAuthError(state),
                selectedInstanceName: null || StateSelector.getSelectedInstanceName(state)
            };
            this._sendMessage(panel, {
                id: MessageId.REDUX_STATE_CHANGE,
                value: properties
            });
        });
        return unsubscribe;
    }
}
