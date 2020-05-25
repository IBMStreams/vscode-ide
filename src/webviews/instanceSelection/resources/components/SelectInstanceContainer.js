import Dropdown from 'carbon-components-react/es/components/Dropdown';
import {
  StructuredListBody, StructuredListCell, StructuredListRow, StructuredListWrapper
} from 'carbon-components-react/es/components/StructuredList';
import _each from 'lodash/each';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';
import ButtonContainer from './ButtonContainer';

export default class SelectInstanceContainer extends Component {
  constructor(props) {
    super(props);

    const { params: { storedInstances, displayPath, defaultInstance } } = this.props;

    this.instanceOptions = [];
    _each(storedInstances, (value) => {
      this.instanceOptions.push({ id: value.connectionId, text: value.instanceName });
    });

    this.state = {
      selectedInstance: storedInstances
        ? this.instanceOptions.find((type) => type.id === defaultInstance.connectionId)
        : null,
    };

    this.themeHandler = new ThemeHandler();
    this.messageHandler = new MessageHandler();
    this.displayPath = displayPath;
  }

  getInstanceDropdown = () => {
    const { selectedInstance } = this.state;
    return (
      <Dropdown
        id="instance"
        titleText="IBM Streams instance"
        label="IBM Streams instance"
        ariaLabel="IBM Streams instance dropdown"
        disabled={false}
        selectedItem={selectedInstance}
        items={this.instanceOptions}
        itemToString={item => (item ? item.text : '')}
        onChange={(e) => {
          this.setState({ selectedInstance: e.selectedItem });
        }}
      />
    );
  }

  getButtonContainer = () => {
    const { selectedInstance } = this.state;
    const { params: { storedInstances, action, postBuildAction } } = this.props;
    const inst = storedInstances.find((type) => type.connectionId === selectedInstance.id);
    const actionCapitalized = this.capitalizeFirstLetter(action);
    const labelTitle = postBuildAction === 1 ? `${actionCapitalized} and submit` : actionCapitalized;
    return (
      <ButtonContainer
        primaryBtn={{
          label: labelTitle,
          isValid: true,
          onClick: () => {
            this.messageHandler.postMessage({
              command: action,
              args: {
                inst
              }
            });
          }
        }}
        secondaryBtn={{
          label: 'Cancel',
          isValid: true,
          onClick: this.closePanel
        }}
      />
    );
  }

  showConnectionDetails = () => {
    const { selectedInstance } = this.state;
    const { params: { storedInstances } } = this.props;
    const instance = storedInstances.find((type) => type.connectionId === selectedInstance.id);
    const { instanceType, authentication } = instance;
    let structuredListData;
    switch (instanceType) {
      case 'v5_cpd':
        structuredListData = [
          { label: 'Streams version', value: 'IBM Cloud Pak for Data deployment' },
          { label: 'Cloud Pak for Data version', value: authentication.cpdVersion.substring(1) },
          { label: 'Cloud Pak for Data URL', value: authentication.cpdUrl },
          { label: 'Cloud Pak for Data username', value: authentication.username }
        ];
        break;
      case 'v5_standalone':
        structuredListData = [
          { label: 'Streams version', value: 'IBM Streams standalone deployment' },
          { label: 'Streams REST service URL', value: authentication.streamsRestServiceUrl },
          { label: 'Streams build service URL', value: authentication.streamsBuildServiceUrl || '-' },
          { label: 'Streams Console URL', value: authentication.streamsConsoleUrl || '-' },
          { label: 'Streams username', value: authentication.username }
        ];
        break;
      case 'v4_streamingAnalytics':
        structuredListData = [
          { label: 'Streams version', value: 'IBM Streaming Analytics on IBM Cloud' },
          { label: 'Streaming Analytics service API key', value: authentication.credentials.apikey },
          { label: 'Streaming Analytics service V2 REST URL', value: authentication.credentials.v2_rest_url }
        ];
        break;
      default:
        structuredListData = null;
        break;
    }

    return structuredListData
      ? (
        <div className="details-container">
          <StructuredListWrapper className="structured-list">
            <StructuredListBody>
              {structuredListData.map((item) => (
                <StructuredListRow className="structured-row" key={item.label}>
                  <StructuredListCell noWrap>{item.label}</StructuredListCell>
                  <StructuredListCell>{item.value}</StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
        </div>
      )
      : (
        <div>
          {selectedInstance.instanceType}
        </div>
      );
  }

  closePanel = () => {
    this.messageHandler.postMessage({ command: 'close-panel' });
  }

  capitalizeFirstLetter = (string) => {
    const action = string === 'build-make' ? 'build' : string;
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  render() {
    return (
      <div className="bx--grid select-instance-container">
        <div className="bx--row">
          <div className="bx--col-lg-10 bx--col-md-6">
            {this.getInstanceDropdown()}
            {this.showConnectionDetails()}
            {this.getButtonContainer()}
          </div>
        </div>
      </div>
    );
  }
}

SelectInstanceContainer.propTypes = {
  params: PropTypes.shape({
    storedInstances: PropTypes.array,
    action: PropTypes.string,
    postBuildAction: PropTypes.any,
    displayPath: PropTypes.string,
    defaultInstance: PropTypes.any
  }).isRequired
};
