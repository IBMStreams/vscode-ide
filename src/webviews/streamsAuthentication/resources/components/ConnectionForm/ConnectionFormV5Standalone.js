import UserAdmin16 from '@carbon/icons-react/es/user--admin/16';
import Button from 'carbon-components-react/es/components/Button';
import Checkbox from 'carbon-components-react/es/components/Checkbox';
import TextInput from 'carbon-components-react/es/components/TextInput';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../../message.ts';
import ButtonContainer from '../ButtonContainer';

export default class ConnectionFormV5Standalone extends Component {
  constructor(props) {
    super(props);

    const {
      params: { instance }
    } = this.props;

    const authentication =
      instance && instance.authentication ? instance.authentication : null;

    this.state = {
      streamsBuildServiceUrl:
        authentication && authentication.streamsBuildServiceUrl
          ? authentication.streamsBuildServiceUrl
          : '',
      streamsRestServiceUrl:
        authentication && authentication.streamsRestServiceUrl
          ? authentication.streamsRestServiceUrl
          : '',
      streamsSecurityServiceUrl:
        authentication && authentication.streamsSecurityServiceUrl
          ? authentication.streamsSecurityServiceUrl
          : '',
      streamsConsoleUrl:
        authentication && authentication.streamsConsoleUrl
          ? authentication.streamsConsoleUrl
          : '',
      username:
        authentication && authentication.username
          ? authentication.username
          : '',
      password:
        authentication && authentication.password
          ? authentication.password
          : '',
      rememberPassword: authentication ? authentication.rememberPassword : true,
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
  };

  getBaseUrl = (urlString) => {
    const url = new URL(urlString);
    const baseUrl = `${url.protocol}//${url.host}`;
    return baseUrl;
  };

  onTextChange = (e) => {
    const { id, value } = e.target;
    this.setState({ [id]: value });
  };

  onCheckboxChange = (checked, id) => {
    this.setState({ [id]: checked });
  };

  validate = () => {
    const {
      streamsBuildServiceUrl,
      streamsRestServiceUrl,
      streamsSecurityServiceUrl,
      streamsConsoleUrl,
      username,
      password
    } = this.state;
    // True if errors, false otherwise
    const errors = {
      username: username.length === 0,
      password: password.length === 0
    };

    // eslint-disable-next-line no-unused-vars
    let url;
    try {
      if (streamsBuildServiceUrl) {
        url = new URL(streamsBuildServiceUrl);
        errors.streamsBuildServiceUrl = false;
      }
    } catch (err) {
      errors.streamsBuildServiceUrl = 'The value must be a valid URL.';
    }
    try {
      url = new URL(streamsRestServiceUrl);
      errors.streamsRestServiceUrl = false;
    } catch (err) {
      errors.streamsRestServiceUrl = 'The value must be a valid URL.';
    }
    try {
      if (streamsSecurityServiceUrl) {
        url = new URL(streamsSecurityServiceUrl);
        errors.streamsSecurityServiceUrl = false;
      }
    } catch (err) {
      errors.streamsSecurityServiceUrl = 'The value must be a valid URL.';
    }
    try {
      if (streamsConsoleUrl) {
        url = new URL(streamsConsoleUrl);
        errors.streamsConsoleUrl = false;
      }
    } catch (err) {
      errors.streamsConsoleUrl = 'The value must be a valid URL.';
    }

    return errors;
  };

  isFormValid = () => {
    const errors = this.validate();
    const isValid = !Object.keys(errors).some((e) => errors[e]);
    return isValid;
  };

  getButtonContainer = () => {
    const {
      streamsBuildServiceUrl,
      streamsRestServiceUrl,
      streamsSecurityServiceUrl,
      streamsConsoleUrl,
      username,
      password,
      rememberPassword
    } = this.state;
    const {
      instanceType,
      closePanel,
      params: { instance }
    } = this.props;
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
                streamsBuildServiceUrl: this.sanitizeUrl(
                  streamsBuildServiceUrl,
                  false
                ),
                streamsRestServiceUrl: this.sanitizeUrl(
                  streamsRestServiceUrl,
                  false
                ),
                streamsSecurityServiceUrl: this.sanitizeUrl(
                  streamsSecurityServiceUrl,
                  false
                ),
                streamsConsoleUrl: this.sanitizeUrl(streamsConsoleUrl, true),
                username,
                password,
                rememberPassword,
                instance
              }
            });
          }
        }}
        secondaryBtn={{
          label: 'Cancel',
          isValid: true,
          onClick: () => {
            closePanel();
          }
        }}
      />
    );
  };

  sanitizeUrl(urlString, keepWholeUrl) {
    try {
      const url = new URL(urlString);
      return keepWholeUrl ? url.href : `${url.protocol}//${url.host}`;
    } catch (error) {
      return null;
    }
  }

  render() {
    const {
      streamsBuildServiceUrl,
      streamsRestServiceUrl,
      streamsSecurityServiceUrl,
      streamsConsoleUrl,
      username,
      password,
      rememberPassword,
      loading,
      isTestingConnection,
      connectionSuccessful,
      isAuthenticating,
      authError
    } = this.state;
    const {
      instanceType,
      renderLoadingOverlay,
      renderTestConnectionNotification,
      renderErrorNotification,
      params: { instance }
    } = this.props;

    const errors = this.validate();
    const isValid = this.isFormValid();
    const restServiceUrlLabel = (
      <>
        <Tooltip
          triggerText="IBM Streams REST service URL"
          iconDescription="IBM Streams REST service URL"
          tabIndex={0}
          className="streams-auth-container__help-tooltip"
        >
          IBM Streams provides a REST API that can be used to retrieve
          information about the instance. This service has a URL associated with
          it. For example, when the service is exposed as a node port:{' '}
          <span className="streams-auth-container__code">
            https://123.45.67.89:30001
          </span>
          .
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
                streamsBuildServiceUrl: this.sanitizeUrl(
                  streamsBuildServiceUrl,
                  false
                ),
                streamsRestServiceUrl: this.sanitizeUrl(
                  streamsRestServiceUrl,
                  false
                ),
                streamsSecurityServiceUrl: this.sanitizeUrl(
                  streamsSecurityServiceUrl,
                  false
                ),
                streamsConsoleUrl: this.sanitizeUrl(streamsConsoleUrl, true),
                username,
                password,
                rememberPassword
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
    const buildServiceUrlLabel = (
      <Tooltip
        triggerText="IBM Streams build service URL (optional)"
        iconDescription="IBM Streams build service URL"
        tabIndex={0}
        className="streams-auth-container__help-tooltip"
      >
        IBM Streams provides an optional build service for compiling and
        building Streams applications. This service has a URL associated with
        it. For example, when the service is exposed as a node port:{' '}
        <span className="streams-auth-container__code">
          https://123.45.67.89:30002
        </span>
        .<br />
        <br />
        If not specified, you will not be able to build your Streams
        applications.
      </Tooltip>
    );
    const securityServiceUrlLabel = (
      <Tooltip
        triggerText="IBM Streams security service URL (optional)"
        iconDescription="IBM Streams security service URL"
        tabIndex={0}
        className="streams-auth-container__help-tooltip"
      >
        IBM Streams provides an optional security service for managing a set of
        security realms to provide single sign-on support for Streams services.
        You can use the security service for both the Streams instance and the
        build service. The security service is required for the build service.
        The security service has a URL associated with it. For example, when the
        service is exposed as a node port:{' '}
        <span className="streams-auth-container__code">
          https://123.45.67.89:30003
        </span>
        .<br />
        <br />
        If not specified, the security service URL will be generated using the
        REST service URL.
      </Tooltip>
    );
    const consoleUrlLabel = (
      <Tooltip
        triggerText="IBM Streams Console URL (optional)"
        iconDescription="IBM Streams Console URL"
        tabIndex={0}
        className="streams-auth-container__help-tooltip"
      >
        IBM Streams includes an integrated console that you can use to view the
        health of the instance and its applications. You can manage instances
        and resources, configure security, and monitor jobs from a single
        location.
        <br />
        <br />
        If not specified, the Console URL will be retrieved from the Streams
        REST API.
      </Tooltip>
    );
    let passwordDisabled = false;
    if (
      instance &&
      instance.authentication.rememberPassword &&
      instance.authentication.password
    ) {
      passwordDisabled = true;
    }
    return (
      <>
        {renderLoadingOverlay(loading, isAuthenticating)}
        {renderTestConnectionNotification(connectionSuccessful, () => {
          this.setState({ connectionSuccessful: null });
        })}
        <div className="connection-form__form-item">
          <TextInput
            type="text"
            id="streamsRestServiceUrl"
            labelText={restServiceUrlLabel}
            placeholder="https://123.45.67.89:30001"
            value={streamsRestServiceUrl}
            disabled={!!instance}
            invalid={
              !!errors.streamsRestServiceUrl && streamsRestServiceUrl.length > 0
            }
            invalidText={errors.streamsRestServiceUrl || null}
            onChange={this.onTextChange}
          />
        </div>
        <div className="connection-form__form-item">
          <TextInput
            type="text"
            id="streamsBuildServiceUrl"
            labelText={buildServiceUrlLabel}
            placeholder={instance ? null : 'https://123.45.67.89:30002'}
            value={streamsBuildServiceUrl}
            disabled={!!instance}
            invalid={
              !!errors.streamsBuildServiceUrl &&
              streamsBuildServiceUrl.length > 0
            }
            invalidText={errors.streamsBuildServiceUrl || null}
            onChange={this.onTextChange}
          />
        </div>
        <div className="connection-form__form-item">
          <TextInput
            type="text"
            id="streamsSecurityServiceUrl"
            labelText={securityServiceUrlLabel}
            placeholder={instance ? null : 'https://123.45.67.89:30003'}
            value={streamsSecurityServiceUrl}
            disabled={!!instance}
            invalid={
              !!errors.streamsSecurityServiceUrl &&
              streamsSecurityServiceUrl.length > 0
            }
            invalidText={errors.streamsSecurityServiceUrl || null}
            onChange={this.onTextChange}
          />
        </div>
        <div className="connection-form__form-item">
          <TextInput
            type="text"
            id="streamsConsoleUrl"
            labelText={consoleUrlLabel}
            placeholder="https://123.45.67.89:30004/streams/console"
            value={streamsConsoleUrl}
            disabled={!!instance}
            invalid={!!errors.streamsConsoleUrl && streamsConsoleUrl.length > 0}
            invalidText={errors.streamsConsoleUrl || null}
            onChange={this.onTextChange}
          />
        </div>
        <div className="connection-form__form-item">
          <TextInput
            type="text"
            id="username"
            labelText="IBM Streams username"
            placeholder="Enter your username"
            value={username}
            disabled={!!instance}
            onChange={this.onTextChange}
          />
        </div>
        <div className="connection-form__form-item">
          <TextInput.PasswordInput
            id="password"
            labelText="IBM Streams password"
            placeholder="Enter your password"
            value={password}
            disabled={passwordDisabled}
            onChange={this.onTextChange}
            ref={(input) => !!instance && input && input.focus && input.focus()}
          />
        </div>
        <div className="connection-form__form-item">
          <Checkbox
            id="rememberPassword"
            checked={rememberPassword}
            labelText="Remember password"
            disabled={passwordDisabled}
            onChange={this.onCheckboxChange}
          />
        </div>
        {renderErrorNotification(authError, 'IBM Streams', () => {
          this.setState({ authError: null });
        })}
        {this.getButtonContainer()}
      </>
    );
  }
}

ConnectionFormV5Standalone.propTypes = {
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
