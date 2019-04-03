import { Disposable, WebviewPanel } from 'vscode';
import { authenticateIcp4d, setCurrentLoginStep, setFormDataField, setSelectedInstance } from '../../build/v5/actions';
import getStore from '../../build/v5/redux-store/configure-store';
import StateSelector from '../../build/v5/util/state-selectors';
import { Constants, SplConfig } from '../../utils';

const enum MessageId {
    AUTHENTICATE_ICP4D = 'authenticateIcp4d',
    CLOSE = 'close',
    CURRENT_STEP = 'currentStep',
    HAS_AUTHENTICATED_ICP4D = 'hasAuthenticatedIcp4d',
    ICP4D_AUTH_ERROR = 'icp4dAuthError',
    INIT_STEP1 = 'initStep1',
    PERSIST_AUTH = 'persistAuth',
    POST_STREAMS_INSTANCE_AUTH = 'postStreamsInstanceAuth',
    PREVIOUS_STEP = 'previousStep',
    REDUX_STATE_CHANGE = 'reduxStateChange',
    SET_INSTANCE = 'setInstance',
    STREAMS_AUTH_ERROR = 'streamsAuthError',
    STREAMS_INSTANCES = 'streamsInstances',
    UPDATE_FORM_DATA_FIELD = 'updateFormDataField'
}

/**
 * Receive a message from the webview
 * @param panel          The webview panel
 * @param disposables    Disposable objects to clean up when the panel is disposed
 */
function receiveMessage(panel: WebviewPanel, disposables: Disposable[]): void {
    panel.webview.onDidReceiveMessage(({ id, value }: { id: string, value: any }) => {
        const state = getStore().getState();
        console.log(state);
        switch (id) {
            case MessageId.CURRENT_STEP:
                sendMessage(panel, {
                    id: MessageId.CURRENT_STEP,
                    value: {
                        currentStep: StateSelector.getCurrentLoginStep(getStore().getState()) || 1
                    }
                });
                break;
            case MessageId.PREVIOUS_STEP:
                const currentStep = StateSelector.getCurrentLoginStep(getStore().getState());
                getStore().dispatch(setCurrentLoginStep(currentStep - 1));
                break;
            case MessageId.INIT_STEP1:
                sendMessage(panel, {
                    id: MessageId.INIT_STEP1,
                    value: {
                        username: StateSelector.getFormUsername(getStore().getState()) || '',
                        password: StateSelector.getFormPassword(getStore().getState()) || '',
                        rememberPassword: StateSelector.getFormRememberPassword(getStore().getState()) || true
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
                const formUsername = StateSelector.getUsername(getStore().getState());
                const formRememberPassword = StateSelector.getRememberPassword(getStore().getState());
                SplConfig.setState(`${Constants.EXTENSION_NAME}.username`, formUsername);
                SplConfig.setState(`${Constants.EXTENSION_NAME}.rememberPassword`, formRememberPassword);
                break;
            case MessageId.SET_INSTANCE:
                const { instance } = value;
                getStore().dispatch(setSelectedInstance(instance));
                break;
            case MessageId.CLOSE:
                panel.dispose();
                getStore().dispatch(setCurrentLoginStep(1));
                break;
        }
    }, null, disposables);
}

/**
 * Send a message to the webview
 * @param panel      The webview panel
 * @param message    The JSON message to send
 */
function sendMessage(panel: WebviewPanel, message: { id: string, value: any }): void {
    panel.webview.postMessage(message);
}

/**
 * Subscribe to Redux state changes
 * @param panel      The webview panel
 * @param setHtml    Function to set panel HTML content
 */
function reduxSubscribe(panel: WebviewPanel, setHtml: () => void): () => void {
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
        sendMessage(panel, {
            id: MessageId.REDUX_STATE_CHANGE,
            value: properties
        });
    });
    return unsubscribe;
}

const ICP4DWebviewPanelUtils = {
    receiveMessage,
    sendMessage,
    reduxSubscribe
};

export default ICP4DWebviewPanelUtils;
