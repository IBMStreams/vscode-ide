import Dropdown from 'carbon-components-react/es/components/Dropdown';
import DropdownSkeleton from 'carbon-components-react/es/components/Dropdown/Dropdown.Skeleton';
import Link from 'carbon-components-react/es/components/Link';
import {
  InlineNotification,
  NotificationActionButton
} from 'carbon-components-react/es/components/Notification';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../../message.ts';
import ButtonContainer from '../ButtonContainer';

export default class ConnectionFormV5CpdStep2 extends Component {
  constructor(props) {
    super(props);

    this.state = {
      streamsInstances: null,
      selectedInstance: null,
      loading: true,
      isAuthenticating: false,
      authError: false
    };

    this.messageHandler = new MessageHandler(this.handleExtensionMessage);

    this.isComponentMounted = false;
  }

  componentDidMount() {
    this.isComponentMounted = true;

    const { setInstanceDropdownDisabled } = this.props;
    setInstanceDropdownDisabled(true);
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
  }

  handleExtensionMessage = (message) => {
    if (this.isComponentMounted) {
      const { command, args } = message;
      let newState = {};
      switch (command) {
        case 'set-streams-instances': {
          const {
            params: { instance }
          } = this.props;
          const {
            result: { connectionId, streamsInstances }
          } = args;
          newState.loading = false;
          newState.connectionId = connectionId;
          newState.streamsInstances = streamsInstances;
          const instanceItems = this.getInstanceItems(streamsInstances);
          if (instanceItems) {
            const defaultInstanceItem = instanceItems.length
              ? instanceItems[0]
              : null;
            const selectedInstanceItem =
              instance && instance.instanceName
                ? instanceItems.find(
                    (instanceItem) => instanceItem.id === instance.instanceName
                  )
                : defaultInstanceItem;
            newState.selectedInstance = selectedInstanceItem;
          }
          this.setState(newState);
          break;
        }
        case 'set-auth-error': {
          newState = args;
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

  onSelectionChange = (e) => {
    this.setState({ selectedInstance: e.selectedItem });
  };

  getInstanceItems = (instances) => {
    const { streamsInstances: stateStreamsInstances } = this.state;
    const { cpdVersion } = this.props;
    const streamsInstances = instances || stateStreamsInstances;
    if (!streamsInstances) {
      return null;
    }
    const instanceItems = streamsInstances.map((streamsInstance) => {
      const instanceName =
        cpdVersion.id === '3.0.0'
          ? streamsInstance.display_name
          : streamsInstance.ServiceInstanceDisplayName;
      return {
        id: instanceName,
        text: instanceName,
        value: streamsInstance
      };
    });
    return instanceItems;
  };

  getButtonContainer = () => {
    const { selectedInstance, connectionId } = this.state;
    const {
      instanceType,
      closePanel,
      setInstanceDropdownDisabled,
      setStep,
      params: { instance }
    } = this.props;
    return (
      <ButtonContainer
        primaryBtn={{
          label: instance ? 'Authenticate' : 'Add',
          isValid: selectedInstance !== null,
          onClick: () => {
            this.setState({ isAuthenticating: true });
            this.messageHandler.postMessage({
              command: 'set-selected-instance',
              args: {
                instanceType,
                streamsInstance: selectedInstance.value,
                connectionId,
                instance
              }
            });
          }
        }}
        secondaryBtn={{
          label: 'Back',
          isValid: true,
          onClick: () => {
            if (!instance) {
              setInstanceDropdownDisabled(false);
              this.messageHandler.postMessage({
                command: 'remove-instance',
                args: { connectionId }
              });
            }
            this.setState({ streamsInstances: null });
            setStep(1);
          }
        }}
        tertiaryBtn={{
          label: 'Cancel',
          onClick: () => {
            if (!instance) {
              this.messageHandler.postMessage({
                command: 'remove-instance',
                args: { connectionId }
              });
            }
            closePanel();
          }
        }}
      />
    );
  };

  render() {
    const {
      streamsInstances,
      selectedInstance,
      loading,
      isAuthenticating,
      authError
    } = this.state;
    const {
      renderLoadingOverlay,
      renderErrorNotification,
      cpdUrl,
      sanitizeUrl,
      params: { instance }
    } = this.props;

    let instancesElement;
    if (!streamsInstances) {
      instancesElement = <DropdownSkeleton />;
    } else if (!streamsInstances.length) {
      const provisionAction = (
        <Link
          href={`${sanitizeUrl(cpdUrl)}/streams/webpage/#/streamsProvisioning`}
          visited={false}
          className="connection-form__provision-link"
        >
          <NotificationActionButton>Provision</NotificationActionButton>
        </Link>
      );
      instancesElement = (
        <InlineNotification
          title="There are no Streams instances."
          subtitle="Provision an instance to continue."
          actions={provisionAction}
          kind="info"
          statusIconDescription="Info"
          hideCloseButton
          className="connection-form__connection-notification"
        />
      );
    } else {
      instancesElement = (
        <Dropdown
          id="instancesDropdown"
          titleText="IBM Streams instance"
          label="Select an instance"
          ariaLabel="IBM Streams instances dropdown"
          disabled={!!instance}
          selectedItem={selectedInstance}
          items={this.getInstanceItems()}
          itemToString={(item) => (item ? item.text : '')}
          onChange={this.onSelectionChange}
        />
      );
    }

    return (
      <>
        {renderLoadingOverlay(loading, isAuthenticating)}
        <div className="connection-form__form-item">{instancesElement}</div>
        {renderErrorNotification(authError, 'IBM Streams', () => {
          this.setState({ authError: null });
        })}
        {this.getButtonContainer()}
      </>
    );
  }
}

ConnectionFormV5CpdStep2.propTypes = {
  instanceType: PropTypes.string.isRequired,
  closePanel: PropTypes.func.isRequired,
  renderLoadingOverlay: PropTypes.func.isRequired,
  renderErrorNotification: PropTypes.func.isRequired,
  setInstanceDropdownDisabled: PropTypes.func.isRequired,
  cpdVersion: PropTypes.shape({
    id: PropTypes.string,
    value: PropTypes.string
  }).isRequired,
  cpdUrl: PropTypes.string.isRequired,
  setStep: PropTypes.func.isRequired,
  sanitizeUrl: PropTypes.func.isRequired,
  params: PropTypes.shape({
    instanceTypes: PropTypes.objectOf(PropTypes.string),
    cpdVersions: PropTypes.objectOf(PropTypes.string),
    instance: PropTypes.object
  }).isRequired
};
