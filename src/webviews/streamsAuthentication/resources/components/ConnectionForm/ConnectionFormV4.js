import UserAdmin16 from '@carbon/icons-react/es/user--admin/16';
import Button from 'carbon-components-react/es/components/Button';
import TextArea from 'carbon-components-react/es/components/TextArea';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../../message.ts';
import ButtonContainer from '../ButtonContainer';

export default class ConnectionFormV4 extends Component {
  constructor(props) {
    super(props);

    const { params: { instance } } = this.props;

    const authentication = instance && instance.authentication ? instance.authentication : null;

    this.state = {
      credentials: (authentication && authentication.credentials) ? JSON.stringify(authentication.credentials, null, 2) : '',
      loading: false,
      isTestingConnection: false,
      connectionSuccessful: null,
      isAuthenticating: false,
      authError: null
    };

    this.messageHandler = new MessageHandler(this.handleExtensionMessage);

    this.isComponentMounted = false;
  }

  componentDidMount() {
    this.isComponentMounted = true;
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
  }

  handleExtensionMessage = (message) => {
    if (this.isComponentMounted) {
      const { command, args } = message;
      switch (command) {
        case 'set-auth-error': {
          const newState = args;
          const { authError } = args;
          if (authError) {
            newState.isAuthenticating = false;
          }
          this.setState(newState);
          break;
        }
        default:
          break;
      }
    }
  }

  onTextChange = (e) => {
    this.setState({ [e.target.id]: e.target.value });
  }

  validate = () => {
    const { credentials } = this.state;
    // True if errors, false otherwise
    const errors = {};

    try {
      // eslint-disable-next-line no-unused-vars
      const json = JSON.parse(credentials);
      if (!json.apikey || !json.v2_rest_url) {
        errors.credentials = 'The value must be valid.';
      }
    } catch (err) {
      errors.credentials = 'The value must be valid JSON.';
    }

    return errors;
  }

  isFormValid = () => {
    const errors = this.validate();
    const isValid = !Object.keys(errors).some((e) => errors[e]);
    return isValid;
  }

  getButtonContainer = () => {
    const { credentials } = this.state;
    const { instanceType, closePanel, params: { instance } } = this.props;
    const isValid = this.isFormValid();
    return (
      <ButtonContainer
        primaryBtn={{
          label: instance ? 'Authenticate' : 'Add',
          isValid,
          onClick: () => {
            this.setState({ isAuthenticating: true });
            this.messageHandler.postMessage({
              command: 'authenticate',
              args: {
                instanceType,
                credentials: JSON.parse(credentials),
                instance
              }
            });
          }
        }}
        secondaryBtn={{
          label: 'Cancel',
          isValid: true,
          onClick: () => { closePanel(); }
        }}
      />
    );
  }

  render() {
    const {
      credentials, loading, isTestingConnection, connectionSuccessful, isAuthenticating, authError
    } = this.state;
    const {
      instanceType, renderLoadingOverlay, renderTestConnectionNotification, renderErrorNotification, params: { instance }
    } = this.props;

    const errors = this.validate();
    const isValid = this.isFormValid();
    const credentialsLabel = (
      <>
        <Tooltip
          triggerText="IBM Streaming Analytics service credentials"
          iconDescription="IBM Streaming Analytics service credentials"
          tabIndex={0}
          className="streams-auth-container__help-tooltip"
        >
          IBM Streaming Analytics is a cloud version of IBM Streams that is available from IBM Cloud.
          Afer you create an instance of the Streaming Analytics service, you may access the service
          credentials (in JSON format) from the service details page.
        </Tooltip>
        <Button
          className="connection-form__test-connection-button"
          disabled={!isValid || isTestingConnection}
          hasIconOnly
          iconDescription="Test connection"
          title="Test connection"
          kind="ghost"
          onClick={async () => {
            this.setState({ isTestingConnection: true });
            const result = await this.messageHandler.postMessage({
              command: 'test-connection',
              args: {
                instanceType,
                credentials: JSON.parse(credentials)
              }
            });
            this.setState({
              isTestingConnection: false,
              connectionSuccessful: result
            });
          }}
          renderIcon={UserAdmin16}
          size="small"
          tooltipAlignment="center"
          tooltipPosition="bottom"
          type="button"
        />
      </>
    );
    return (
      <>
        {renderLoadingOverlay(loading, isAuthenticating)}
        {renderTestConnectionNotification(connectionSuccessful, () => { this.setState({ connectionSuccessful: null }); })}
        <div className="connection-form__form-item">
          <TextArea
            id="credentials"
            labelText={credentialsLabel}
            placeholder="{ &quot;apikey&quot;: ..., &quot;v2_rest_url&quot;: ... }"
            value={credentials}
            disabled={!!instance}
            invalid={!!errors.credentials && credentials.length > 0}
            invalidText={errors.credentials || null}
            onChange={this.onTextChange}
            className="connection-form-v4__credentials"
            rows={16}
          />
        </div>
        {renderErrorNotification(authError, 'IBM Streaming Analytics', () => { this.setState({ authError: null }); })}
        {this.getButtonContainer()}
      </>
    );
  }
}

ConnectionFormV4.propTypes = {
  instanceType: PropTypes.string.isRequired,
  closePanel: PropTypes.func.isRequired,
  renderLoadingOverlay: PropTypes.func.isRequired,
  renderTestConnectionNotification: PropTypes.func.isRequired,
  renderErrorNotification: PropTypes.func.isRequired,
  params: PropTypes.shape({
    instanceTypes: PropTypes.objectOf(PropTypes.string),
    cpdVersions: PropTypes.objectOf(PropTypes.string),
    instance: PropTypes.object
  }).isRequired
};
