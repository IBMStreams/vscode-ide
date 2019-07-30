export const Component = {
  STEP1: 'step1',
  STEP2: 'step2',
  STEP3: 'step3',
  WIZARD: 'wizard'
};

const MessageId = {
  AUTHENTICATE_ICP4D: 'authenticateIcp4d',
  CLOSE: 'close',
  CURRENT_STEP: 'currentStep',
  INIT_STEP1: 'initStep1',
  PERSIST_AUTH: 'persistAuth',
  PREVIOUS_STEP: 'previousStep',
  REDUX_STATE_CHANGE: 'reduxStateChange',
  SET_INSTANCE: 'setInstance',
  UPDATE_FORM_DATA_FIELD: 'updateFormDataField'
};

export class Utils {
    vscode = null;

    setStateFns = null;

    constructor(vscode) {
      this.vscode = vscode;
    }

    /**
     * Initialize
     */
    init(component, setState, callback) {
      if (!this.setStateFns) {
        this.setStateFns = {};
      }
      this.setStateFns[component] = setState;

      this.restoreState(component, callback);
      this.receiveMessages(component);
    }

    /**
     * Restore state when the webview is visible
     */
    restoreState(component, callback) {
      const state = this.vscode.getState();
      if (!state) {
        if (callback) {
          callback();
        }
        return;
      }

      const componentState = state[component];
      if (!componentState) {
        if (callback) {
          callback();
        }
        return;
      }
      const setStateFn = this.setStateFns[component];
      if (callback) {
        setStateFn(componentState, callback);
      } else {
        setStateFn(componentState);
      }
    }

    /**
     * Save state so that it persists when the webview is hidden
     */
    persistState(component, componentState) {
      const state = this.vscode.getState();
      let newState = state;
      if (!newState) {
        newState = { [component]: componentState };
      } else {
        newState[component] = componentState;
      }
      this.vscode.setState(newState);
    }

    /**
     * Receive messages from the extension
     */
    receiveMessages(component) {
      const setStateFn = this.setStateFns[component];
      window.addEventListener('message', event => {
        const { id, value } = event.data;
        if (id === MessageId.REDUX_STATE_CHANGE) {
          switch (component) {
            case Component.WIZARD:
              setStateFn({
                currentStep: value.currentStep
              });
              break;
            case Component.STEP1:
              setStateFn({
                username: value.username,
                password: value.password,
                rememberPassword: value.rememberPassword,
                hasAuthenticatedIcp4d: value.hasAuthenticatedIcp4d,
                icp4dAuthError: value.icp4dAuthError
              });
              break;
            case Component.STEP2:
              setStateFn({
                streamsInstances: value.streamsInstances
              });
              break;
            case Component.STEP3:
              setStateFn({
                streamsAuthError: value.streamsAuthError,
                selectedInstanceName: value.selectedInstanceName
              });
              break;
            default:
              break;
          }
        } else {
          switch (component) {
            case Component.WIZARD:
              switch (id) {
                case MessageId.CURRENT_STEP: {
                  const { currentStep } = value;
                  setStateFn({ loading: false, currentStep });
                  break;
                }
                default:
                  break;
              }
              break;
            case Component.STEP1:
              switch (id) {
                case MessageId.INIT_STEP1: {
                  const { username, password, rememberPassword } = value;
                  setStateFn({
                    loading: false,
                    username,
                    password,
                    rememberPassword
                  });
                  break;
                }
                default:
                  break;
              }
              break;
            default:
              break;
          }
        }
      });
    }

    /**
     * Send a message to the extension
     */
    sendMessage(id, value) {
      this.vscode.postMessage({
        id,
        value
      });
    }

    /**
     * Get current login step from Redux store
     */
    getCurrentLoginStep() {
      this.sendMessage(MessageId.CURRENT_STEP, null);
    }

    /**
     * Go to previous login step
     */
    previousLoginStep() {
      this.sendMessage(MessageId.PREVIOUS_STEP, null);
    }

    /**
     * Initialize state for Step 1
     */
    initStep1() {
      this.sendMessage(MessageId.INIT_STEP1, null);
    }

    /**
     * Update form field values in Redux store
     */
    updateFormDataField(formKey, formValue) {
      this.sendMessage(MessageId.UPDATE_FORM_DATA_FIELD, { formKey, formValue });
    }

    /**
     * Authenticate to ICP4D
     */
    authenticateIcp4d(username, password, rememberPassword) {
      this.sendMessage(MessageId.AUTHENTICATE_ICP4D, { username, password, rememberPassword });
    }

    /**
     * Persist authentication details
     */
    persistAuth() {
      this.sendMessage(MessageId.PERSIST_AUTH, null);
    }

    /**
     * Set Streams instances in Redux store
     */
    setInstance(instance) {
      this.sendMessage(MessageId.SET_INSTANCE, { instance });
    }

    /**
     * Close the panel
     */
    closePanel() {
      this.sendMessage(MessageId.CLOSE, null);
    }
}
