import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { ConnectionFormV5CpdStep1, ConnectionFormV5CpdStep2 } from '.';
import MessageHandler from '../../../../message.ts';

const properties = {
  CPD_URL: 'cpdUrl',
  CPD_VERSION: 'cpdVersion',
  CPD_USERNAME: 'username',
  CPD_PASSWORD: 'password',
  USE_CPD_MASTER_NODE_HOST: 'useCpdMasterNodeHost',
  REMEMBER_PASSWORD: 'rememberPassword'
};

export default class ConnectionFormV5Cpd extends Component {
  constructor(props) {
    super(props);

    const { params: { cpdVersions, instance } } = this.props;

    const authentication = instance && instance.authentication ? instance.authentication : null;

    this.state = {
      step: 1,
      cpdUrl: (authentication && authentication.cpdUrl) ? authentication.cpdUrl : '',
      cpdVersion: (authentication && authentication.cpdVersion)
        ? { id: authentication.cpdVersion, text: cpdVersions[authentication.cpdVersion] }
        : null,
      username: (authentication && authentication.username) ? authentication.username : '',
      password: (authentication && authentication.password) ? authentication.password : '',
      useCpdMasterNodeHost: authentication ? authentication.useCpdMasterNodeHost : true,
      rememberPassword: authentication ? authentication.rememberPassword : true
    };

    this.messageHandler = new MessageHandler(this.handleExtensionMessage);
  }

  handleExtensionMessage = (message) => {
    const { command, args } = message;
    switch (command) {
      case 'set-v5cpd-connection-form-step':
        this.setState(args);
        break;
      default:
        break;
    }
  }

  setStep = (step) => {
    this.setState({ step });
  }

  setValue = (property, value) => {
    this.setState({ [property]: value });
  }

  sanitizeUrl = (urlString) => {
    try {
      const url = new URL(urlString);
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      return null;
    }
  }

  render() {
    const {
      step, cpdVersion, cpdUrl, username, password, useCpdMasterNodeHost, rememberPassword
    } = this.state;

    return step === 1
      ? (
        <ConnectionFormV5CpdStep1
          cpdVersion={cpdVersion}
          cpdUrl={cpdUrl}
          username={username}
          password={password}
          useCpdMasterNodeHost={useCpdMasterNodeHost}
          rememberPassword={rememberPassword}
          setValue={this.setValue}
          sanitizeUrl={this.sanitizeUrl}
          properties={properties}
          {...this.props}
        />
      )
      : (
        <ConnectionFormV5CpdStep2
          cpdVersion={cpdVersion}
          cpdUrl={cpdUrl}
          setCpdVersion={this.setCpdVersion}
          setStep={this.setStep}
          sanitizeUrl={this.sanitizeUrl}
          {...this.props}
        />
      );
  }
}

ConnectionFormV5Cpd.propTypes = {
  instanceType: PropTypes.string.isRequired,
  closePanel: PropTypes.func.isRequired,
  setInstanceDropdownDisabled: PropTypes.func.isRequired,
  params: PropTypes.shape({
    instanceTypes: PropTypes.objectOf(PropTypes.string),
    cpdVersions: PropTypes.objectOf(PropTypes.string),
    instance: PropTypes.object
  }).isRequired
};
