import UserAdmin16 from '@carbon/icons-react/es/user--admin/16';
import Button from 'carbon-components-react/es/components/Button';
import Checkbox from 'carbon-components-react/es/components/Checkbox';
import Dropdown from 'carbon-components-react/es/components/Dropdown';
import FormLabel from 'carbon-components-react/es/components/FormLabel';
import RadioButton from 'carbon-components-react/es/components/RadioButton';
import RadioButtonGroup from 'carbon-components-react/es/components/RadioButtonGroup';
import TextInput from 'carbon-components-react/es/components/TextInput';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../../message.ts';
import ButtonContainer from '../ButtonContainer';

export default class ConnectionFormV5CpdStep1 extends Component {
  constructor(props) {
    super(props);

    this.state = {
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

  onTextChange = (e) => {
    const { setValue } = this.props;
    const { id, value } = e.target;
    setValue(id, value);
  };

  onCheckboxChange = (checked, id) => {
    const { setValue } = this.props;
    setValue(id, checked);
  };

  onSelectionChange = (e) => {
    const { setValue, properties } = this.props;
    setValue(properties.CPD_VERSION, e.selectedItem);
  };

  onRadioButtonChange = (value) => {
    const { setValue } = this.props;
    setValue('authType', value);
    if (value === 'apiKey') {
      setValue('password', '');
      setValue('rememberPassword', false);
      setValue('rememberApiKey', true);
    }
    if (value === 'password') {
      setValue('apiKey', '');
      setValue('rememberApiKey', false);
      setValue('rememberPassword', true);
    }
  };

  getVersionItems = () => {
    const {
      params: { cpdVersions }
    } = this.props;
    const versionItems = [];
    Object.keys(cpdVersions).forEach((key) => {
      versionItems.push({
        id: key,
        text: cpdVersions[key]
      });
    });
    return versionItems;
  };

  validate = () => {
    const { cpdUrl, username, password, apiKey } = this.props;
    const { cpdVersion } = this.props;
    // True if errors, false otherwise
    const errors = {
      username: username.length === 0,
      passwordOrKey: password.length === 0 && apiKey.length === 0,
      cpdVersion: !cpdVersion
    };

    try {
      // eslint-disable-next-line no-unused-vars
      const url = new URL(cpdUrl);
      errors.cpdUrl = false;
    } catch (err) {
      errors.cpdUrl = 'The value must be a valid URL.';
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
      cpdUrl,
      username,
      password,
      apiKey,
      authType,
      useCpdMasterNodeHost,
      rememberPassword,
      rememberApiKey,
      sanitizeUrl
    } = this.props;
    const {
      instanceType,
      closePanel,
      cpdVersion,
      params: { instance }
    } = this.props;
    const isValid = this.isFormValid();
    return (
      <ButtonContainer
        primaryBtn={{
          label: 'Next',
          showIcon: true,
          isValid,
          onClick: () => {
            this.setState({ isAuthenticating: true });
            this.messageHandler.postMessage({
              command: 'authenticate',
              args: {
                instanceType,
                cpdVersion: cpdVersion.id,
                cpdUrl: sanitizeUrl(cpdUrl),
                useCpdMasterNodeHost,
                username,
                password,
                apiKey,
                authType,
                rememberPassword,
                rememberApiKey,
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

  render() {
    const {
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
      cpdUrl,
      cpdVersion,
      username,
      password,
      useCpdMasterNodeHost,
      rememberPassword,
      rememberApiKey,
      sanitizeUrl,
      properties,
      apiKey,
      params: { instance },
      authType
    } = this.props;

    const errors = this.validate();
    const isValid = this.isFormValid();
    const cpdVersionLabel = (
      <Tooltip
        triggerText="IBM Cloud Pak for Data version"
        iconDescription="IBM Cloud Pak for Data version"
        tabIndex={0}
        className="streams-auth-container__help-tooltip"
      >
        The version of Cloud Pak for Data.
        <br />
        <br />
        The version number can be found in the Cloud Pak for Data web client in
        the <strong>About</strong> section.
      </Tooltip>
    );
    const cpdUrlLabel = (
      <>
        <Tooltip
          triggerText="IBM Cloud Pak for Data URL"
          iconDescription="IBM Cloud Pak for Data URL"
          tabIndex={0}
          className="streams-auth-container__help-tooltip"
        >
          The URL for the Cloud Pak for Data web client. For example, if your
          web client URL is{' '}
          <span className="streams-auth-container__code">
            https://123.45.67.89:12345/zen
          </span>
          , then enter{' '}
          <span className="streams-auth-container__code">
            https://123.45.67.89:12345
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
                cpdVersion: cpdVersion.id,
                cpdUrl: sanitizeUrl(cpdUrl),
                useCpdMasterNodeHost,
                username,
                password,
                apiKey,
                authType,
                rememberPassword,
                rememberApiKey
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
    const authMethodLabel = (
      <Tooltip
        triggerText="Authentication method"
        iconDescription="Authentication method"
        tabIndex={0}
        className="streams-auth-container__help-tooltip"
      >
        The method used to authenticate to the Streams service instance. You may
        either use basic authentication via a password, or single sign-on (SSO)
        via an API key.
      </Tooltip>
    );

    const apiKeyLabel = (
      <Tooltip
        triggerText="IBM Cloud Pak for Data API key"
        iconDescription="Authentication method"
        tabIndex={0}
        className="streams-auth-container__help-tooltip"
      >
        You may generate a new API key in the Cloud Pak for Data web client.
        Navigate to the <strong>Profile and settings</strong> section and click
        on the <strong>Generate API key</strong> button.
        <br />
        <br />
        Note: This is your unique key and it is non-recoverable. If you lose
        this API key, you will have to reset it.
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
    let apiKeyDisabled = false;
    if (
      instance &&
      instance.authentication.rememberApiKey &&
      instance.authentication.apiKey
    ) {
      apiKeyDisabled = true;
    }

    return (
      <>
        {renderLoadingOverlay(loading, isAuthenticating)}
        <div className="connection-form__form-item">
          <Dropdown
            id={properties.CPD_VERSION}
            titleText={cpdVersionLabel}
            label="Select a version"
            ariaLabel="IBM Cloud Pak for Data version dropdown"
            disabled={!!instance}
            selectedItem={cpdVersion}
            items={this.getVersionItems()}
            itemToString={(item) => (item ? item.text : '')}
            onChange={this.onSelectionChange}
          />
        </div>
        {renderTestConnectionNotification(connectionSuccessful, () => {
          this.setState({ connectionSuccessful: null });
        })}
        <div className="connection-form__form-item">
          <TextInput
            type="text"
            id={properties.CPD_URL}
            labelText={cpdUrlLabel}
            placeholder="https://123.45.67.89:12345"
            value={cpdUrl}
            disabled={!!instance}
            invalid={!!errors.cpdUrl && cpdUrl.length > 0}
            invalidText={errors.cpdUrl || null}
            onChange={this.onTextChange}
          />
        </div>
        <div className="connection-form__form-item">
          <TextInput
            type="text"
            id={properties.CPD_USERNAME}
            labelText="IBM Cloud Pak for Data username"
            placeholder="Enter your username"
            value={username}
            disabled={!!instance}
            onChange={this.onTextChange}
          />
        </div>
        <div className="connection-form__form-item">
          <FormLabel className={instance ? 'bx--label--disabled' : null}>
            {authMethodLabel}
          </FormLabel>
          <RadioButtonGroup
            defaultSelected={authType}
            name="radio-button-group-auth-method"
            orientation="horizontal"
            disabled={!!instance}
            onChange={this.onRadioButtonChange}
          >
            <RadioButton
              value="password"
              id="radio-password"
              labelText="Password"
              disabled={!!instance}
            />
            <RadioButton
              value="apiKey"
              id="radio-apiKey"
              labelText="API key"
              disabled={!!instance}
            />
          </RadioButtonGroup>
        </div>
        {authType === 'apiKey' && (
          <div className="connection-form__form-item">
            <TextInput
              id="apiKey"
              labelText={apiKeyLabel}
              placeholder="Enter your API key"
              value={apiKey}
              disabled={passwordDisabled || apiKeyDisabled}
              onChange={this.onTextChange}
              ref={(input) =>
                !!instance && input && input.focus && input.focus()
              }
            />
          </div>
        )}
        {authType === 'password' && (
          <div className="connection-form__form-item">
            <TextInput.PasswordInput
              id={properties.CPD_PASSWORD}
              labelText="IBM Cloud Pak for Data password"
              placeholder="Enter your password"
              value={password}
              disabled={passwordDisabled || apiKeyDisabled}
              onChange={this.onTextChange}
              ref={(input) =>
                !!instance && input && input.focus && input.focus()
              }
            />
          </div>
        )}
        <div className="connection-form__form-item--compact">
          <Checkbox
            id={properties.USE_CPD_MASTER_NODE_HOST}
            checked={useCpdMasterNodeHost}
            labelText="Use the host specified in the IBM Cloud Pak for Data URL for all requests"
            disabled={!!instance}
            onChange={this.onCheckboxChange}
          />
        </div>
        {authType === 'password' && (
          <div className="connection-form__form-item">
            <Checkbox
              id={properties.REMEMBER_PASSWORD}
              checked={rememberPassword}
              labelText="Remember password"
              disabled={passwordDisabled}
              onChange={this.onCheckboxChange}
            />
          </div>
        )}
        {authType === 'apiKey' && (
          <div className="connection-form__form-item">
            <Checkbox
              id={properties.REMEMBER_APIKEY}
              checked={rememberApiKey}
              labelText="Remember API key"
              disabled={apiKeyDisabled}
              onChange={this.onCheckboxChange}
            />
          </div>
        )}
        {renderErrorNotification(authError, 'IBM Cloud Pak for Data', () => {
          this.setState({ authError: null });
        })}
        {this.getButtonContainer()}
      </>
    );
  }
}

ConnectionFormV5CpdStep1.defaultProps = {
  cpdVersion: null
};

ConnectionFormV5CpdStep1.propTypes = {
  instanceType: PropTypes.string.isRequired,
  closePanel: PropTypes.func.isRequired,
  renderLoadingOverlay: PropTypes.func.isRequired,
  renderTestConnectionNotification: PropTypes.func.isRequired,
  renderErrorNotification: PropTypes.func.isRequired,
  cpdUrl: PropTypes.string.isRequired,
  cpdVersion: PropTypes.shape({
    id: PropTypes.string,
    value: PropTypes.string
  }),
  username: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  apiKey: PropTypes.string.isRequired,
  authType: PropTypes.string.isRequired,
  useCpdMasterNodeHost: PropTypes.bool.isRequired,
  rememberPassword: PropTypes.bool.isRequired,
  rememberApiKey: PropTypes.bool.isRequired,
  setValue: PropTypes.func.isRequired,
  sanitizeUrl: PropTypes.func.isRequired,
  properties: PropTypes.shape({
    CPD_URL: PropTypes.string,
    CPD_VERSION: PropTypes.string,
    CPD_USERNAME: PropTypes.string,
    CPD_PASSWORD: PropTypes.string,
    USE_CPD_MASTER_NODE_HOST: PropTypes.string,
    REMEMBER_PASSWORD: PropTypes.string,
    REMEMBER_APIKEY: PropTypes.string
  }).isRequired,
  params: PropTypes.shape({
    instanceTypes: PropTypes.objectOf(PropTypes.string),
    cpdVersions: PropTypes.objectOf(PropTypes.string),
    instance: PropTypes.object
  }).isRequired
};
