import Dropdown from 'carbon-components-react/es/components/Dropdown';
import Loading from 'carbon-components-react/es/components/Loading';
import { InlineNotification } from 'carbon-components-react/es/components/Notification';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import _each from 'lodash/each';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';
import ButtonContainer from './ButtonContainer';
import { ConnectionFormV4, ConnectionFormV5Cpd, ConnectionFormV5Standalone } from './ConnectionForm';

export default class StreamsAuthContainer extends Component {
  constructor(props) {
    super(props);

    const { params: { instanceTypes, instance } } = this.props;

    this.typeOptions = [];
    _each(instanceTypes, (value, key) => {
      this.typeOptions.push({ id: key, text: value });
    });

    this.state = {
      selectedInstanceType: instance
        ? this.typeOptions.find((type) => type.id === instance.instanceType)
        : null,
      isInstanceDropdownDisabled: !!instance
    };

    this.themeHandler = new ThemeHandler();
    this.messageHandler = new MessageHandler();
  }

  setInstanceDropdownDisabled = (disabled) => {
    this.setState({ isInstanceDropdownDisabled: disabled });
  }

  getInstanceTypeDropdown = () => {
    const { selectedInstanceType, isInstanceDropdownDisabled } = this.state;
    const label = (
      <Tooltip
        triggerText="IBM Streams version"
        iconDescription="IBM Streams version"
        tabIndex={0}
        className="streams-auth-container__help-tooltip"
      >
        An <strong>IBM Cloud Pak for Data deployment</strong> delivers a platform for combining streaming and
        stored data with AI to build solutions that impact business decisions in real time.<br /><br />
        An <strong>IBM Streams standalone deployment</strong> delivers a programming language and IDE for applications, a runtime system and
        analytic toolkits to speed development.<br /><br />
        <strong>IBM Streaming Analytics on IBM Cloud</strong> offers most of the features of IBM Streams on an agile, cloud-based
        platform.
      </Tooltip>
    );
    return (
      <div className="connection-form__form-item">
        <Dropdown
          id="instanceType"
          titleText={label}
          label="Select a version"
          ariaLabel="IBM Streams version dropdown"
          disabled={isInstanceDropdownDisabled}
          selectedItem={selectedInstanceType}
          items={this.typeOptions}
          itemToString={item => (item ? item.text : '')}
          onChange={(e) => {
            this.setState({ selectedInstanceType: e.selectedItem });
          }}
        />
      </div>
    );
  }

  getConnectionForm = () => {
    const { selectedInstanceType } = this.state;
    if (!selectedInstanceType) {
      return this.getButtonContainer();
    }

    const { id } = selectedInstanceType;
    let connectionForm = null;
    if (id === 'v5_cpd') {
      connectionForm = (
        <ConnectionFormV5Cpd
          instanceType={id}
          closePanel={this.closePanel}
          renderLoadingOverlay={this.renderLoadingOverlay}
          renderTestConnectionNotification={this.renderTestConnectionNotification}
          renderErrorNotification={this.renderErrorNotification}
          setInstanceDropdownDisabled={this.setInstanceDropdownDisabled}
          {...this.props}
        />
      );
    } else if (id === 'v5_standalone') {
      connectionForm = (
        <ConnectionFormV5Standalone
          instanceType={id}
          closePanel={this.closePanel}
          renderLoadingOverlay={this.renderLoadingOverlay}
          renderTestConnectionNotification={this.renderTestConnectionNotification}
          renderErrorNotification={this.renderErrorNotification}
          {...this.props}
        />
      );
    } else if (id === 'v4_streamingAnalytics') {
      connectionForm = (
        <ConnectionFormV4
          instanceType={id}
          closePanel={this.closePanel}
          renderLoadingOverlay={this.renderLoadingOverlay}
          renderTestConnectionNotification={this.renderTestConnectionNotification}
          renderErrorNotification={this.renderErrorNotification}
          {...this.props}
        />
      );
    }
    return connectionForm;
  }

  getButtonContainer = () => {
    return (
      <ButtonContainer
        primaryBtn={{
          label: 'Cancel',
          isValid: true,
          onClick: this.closePanel
        }}
        secondaryBtn={null}
        tertiaryBtn={null}
      />
    );
  }

  renderLoadingOverlay = (loading, isAuthenticating) => {
    if (loading || isAuthenticating) {
      return <Loading description="Loading..." />;
    }
  }

  renderTestConnectionNotification = (connectionSuccessful, callbackFn) => {
    if (connectionSuccessful === null) {
      return null;
    }
    const { result } = connectionSuccessful;
    let { errorMsg } = connectionSuccessful;
    if (errorMsg) {
      errorMsg = this.handleErrorMsg(errorMsg);
    }
    return result
      ? (
        <InlineNotification
          title="Success"
          subtitle="Connection test succeeded."
          iconDescription="Close"
          kind="success"
          statusIconDescription="Success"
          onCloseButtonClick={callbackFn}
          className="connection-form__connection-notification"
        />
      )
      : (
        <InlineNotification
          title="Error"
          subtitle={`Connection test failed.${errorMsg ? ` ${errorMsg}` : ''}`}
          iconDescription="Close"
          kind="error"
          statusIconDescription="Error"
          onCloseButtonClick={callbackFn}
          className="connection-form__connection-notification"
        />
      );
  }

  renderErrorNotification = (authError, type, callbackFn) => {
    if (!authError) {
      return null;
    }

    const message = this.handleErrorMsg(authError.message);
    return (
      <InlineNotification
        title="Error"
        subtitle={message}
        iconDescription="Close"
        kind="error"
        statusIconDescription="Error"
        onCloseButtonClick={callbackFn}
        className="connection-form__error-notification"
      />
    );
  }

  closePanel = () => {
    this.messageHandler.postMessage({ command: 'close-panel' });
  }

  handleErrorMsg = (msg) => {
    const requestTimedOut = msg.includes('The request timed out')
      && msg.includes('Try updating the request timeout setting to a larger value');
    const verifyMessage = 'Verify that the instance exists and the connection details you have provided are correct';
    let newMsg = msg;
    if (!msg.includes(verifyMessage)) {
      if (requestTimedOut) {
        newMsg = msg.replace(/Try updating/, `${verifyMessage}, or try updating`);
      } else {
        newMsg += ` ${verifyMessage}.`;
      }
    }
    return newMsg;
  }

  render() {
    const { loading } = this.state;

    if (loading) {
      return <Loading description="Loading..." />;
    }

    return (
      <div className="bx--grid streams-auth-container">
        <div className="bx--row">
          <div className="bx--col-lg-10 bx--col-md-6">
            {this.getInstanceTypeDropdown()}
            {this.getConnectionForm()}
          </div>
        </div>
      </div>
    );
  }
}

StreamsAuthContainer.propTypes = {
  params: PropTypes.shape({
    instanceTypes: PropTypes.objectOf(PropTypes.string),
    cpdVersions: PropTypes.objectOf(PropTypes.string),
    instance: PropTypes.object
  }).isRequired
};
