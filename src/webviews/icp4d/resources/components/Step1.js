import PropTypes from 'prop-types';
import * as React from 'react';
import {
  Alert, Button, ButtonToolbar, Form, Modal
} from 'react-bootstrap';
import ReactLoading from 'react-loading';
import { Component } from '../utils';
import './Step1.css';

export default class Step1 extends React.Component {
  constructor(props) {
    super(props);

    this.component = Component.STEP1;
    this.step = 1;

    this.state = {
      loading: true,
      isAuthenticating: false,
      touched: {
        username: false,
        password: false
      }
    };
  }

  componentDidMount() {
    const { currentStep, utils } = this.props;
    utils.init(this.component, this.setState.bind(this), () => {
      if (currentStep === this.step) {
        utils.initStep1();
      }
    });
  }

  componentDidUpdate() {
    const { utils } = this.props;
    utils.persistState(this.component, this.state);
  }

  static getDerivedStateFromProps(props, currentState) {
    const { icp4dAuthError, hasAuthenticatedIcp4d } = currentState;
    if (icp4dAuthError || hasAuthenticatedIcp4d) {
      return ({ isAuthenticating: false });
    }
    return null;
  }

  onTextChange = (e) => {
    const { utils } = this.props;
    utils.updateFormDataField(e.target.name, e.target.value);
  }

  onCheckboxChange = (e) => {
    const { utils } = this.props;
    utils.updateFormDataField(e.target.name, e.target.checked);
  }

  onBlur = (e) => {
    const { touched } = this.state;
    this.setState({
      touched: { ...touched, [e.target.name]: true }
    });
  }

  renderErrorHeader = () => {
    const { icp4dAuthError } = this.state;
    if (!icp4dAuthError) {
      return null;
    }

    switch (icp4dAuthError) {
      case 401:
        return (
          <Alert dismissible variant="danger">
            Incorrect username or password.
          </Alert>
        );
      default:
        return (
          <Alert dismissible variant="danger">
            An error occurred while authenticating.
          </Alert>
        );
    }
  }

  renderLoadingSpinner = () => {
    const { isAuthenticating } = this.state;
    return isAuthenticating ? (
      <Modal className="loadingModal" show={isAuthenticating} onHide={() => {}} centered>
        <ReactLoading className="loadingSpinner" type="spin" height="10%" width="10%" />
      </Modal>
    ) : null;
  }

  validate = (username, password) => ({
    username: username.length === 0,
    password: password.length === 0
  })

  showError = (errors, touched, field) => {
    const hasError = errors[field];
    const shouldShow = touched[field];
    return hasError ? shouldShow : false;
  }

  render() {
    const { currentStep, utils } = this.props;

    const {
      loading,
      username,
      password,
      rememberPassword,
      touched
    } = this.state;

    if (currentStep !== this.step || loading || username == null || password == null) {
      return null;
    }

    const errors = this.validate(username, password);
    const isEnabled = !Object.keys(errors).some(field => errors[field]);

    return (
      <div>
        {this.renderErrorHeader()}

        {this.renderLoadingSpinner()}

        <Form>
          <Form.Group controlId="formUsername">
            <Form.Label>Username</Form.Label>
            <Form.Control
              className={this.showError(errors, touched, 'username') ? 'errorInput' : ''}
              size="sm"
              type="text"
              name="username"
              placeholder="Your username"
              ref={e => this.usernameInput = e}
              onBlur={this.onBlur}
              onChange={this.onTextChange}
              value={username}
            />
          </Form.Group>

          <Form.Group controlId="formPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              className={this.showError(errors, touched, 'password') ? 'errorInput' : ''}
              size="sm"
              type="password"
              name="password"
              placeholder="Your password"
              onBlur={this.onBlur}
              onChange={this.onTextChange}
              value={password}
            />
          </Form.Group>

          <Form.Group controlId="formCheckbox">
            <Form.Check
              name="rememberPassword"
              checked={rememberPassword}
              type="checkbox"
              label="Remember my password"
              onChange={this.onCheckboxChange}
            />
          </Form.Group>

          <ButtonToolbar className="justify-content-between">
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!isEnabled}
              onClick={() => {
                this.setState({ isAuthenticating: true, icp4dAuthError: false });
                utils.authenticateIcp4d(username, password, rememberPassword);
              }}
            >
              Log in
            </Button>

            <Button
              variant="secondary"
              size="sm"
              type="submit"
              onClick={() => utils.closePanel()}
            >
              Cancel
            </Button>
          </ButtonToolbar>
        </Form>
      </div>
    );
  }
}

Step1.propTypes = {
  currentStep: PropTypes.number.isRequired,
  utils: PropTypes.shape({
    authenticateIcp4d: PropTypes.func,
    closePanel: PropTypes.func,
    init: PropTypes.func,
    persistState: PropTypes.func,
    initStep1: PropTypes.func,
    updateFormDataField: PropTypes.func
  }).isRequired
};
