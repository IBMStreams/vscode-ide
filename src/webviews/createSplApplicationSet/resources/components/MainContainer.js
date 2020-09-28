import Button from 'carbon-components-react/es/components/Button';
import TextInput from 'carbon-components-react/es/components/TextInput';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';
import ButtonContainer from './ButtonContainer';

const LOCATION_LABEL = 'Location';
const LOCATION_HELP_TEXT = 'The location of the folder where you want to create the SPL application set.';
const NAME_LABEL = 'Name';
const NAME_HELP_TEXT = 'The name of the SPL application set.';

const Property = {
  LOCATION: 'location',
  NAME: 'name'
};

const MainContainer = ({ params: { folderPath } }) => {
  // eslint-disable-next-line no-unused-vars
  const themeHandler = new ThemeHandler();
  const messageHandler = new MessageHandler();

  const [location, setLocation] = useState(folderPath || '');
  const [name, setName] = useState('');
  const [locationExists, setLocationExists] = useState(true);

  useEffect(() => {
    const checkIfLocationExists = async () => {
      const exists = await messageHandler.postMessage({
        command: 'check-if-location-folder-exists',
        args: { location }
      });
      setLocationExists(exists);
    };
    if (location !== '') {
      checkIfLocationExists();
    } else {
      setLocationExists(true);
    }
  }, [location]);

  const getHelpTooltip = (label, tooltipText) => {
    return (
      <Tooltip
        triggerText={label}
        iconDescription={label}
        direction="right"
        tabIndex={0}
        className="main-container__help-tooltip"
      >
        {tooltipText}
      </Tooltip>
    );
  };

  const isLocationValueInvalid = () => !locationExists;

  const isNameValueInvalid = () => !name.trim().length;

  const getButtonContainer = () => {
    const isValid = location.trim() !== '' && name.trim() !== '' && !isLocationValueInvalid(location) && !isNameValueInvalid(name);
    return (
      <ButtonContainer
        primaryBtn={{
          label: 'Create',
          isValid,
          onClick: () => {
            messageHandler.postMessage({
              command: 'create-spl-application-set',
              args: {
                [Property.LOCATION]: location,
                [Property.NAME]: name
              }
            });
          }
        }}
        secondaryBtn={{
          label: 'Cancel',
          isValid: true,
          onClick: () => messageHandler.postMessage({ command: 'close-panel' })
        }}
      />
    );
  };

  const onTextInputChange = (e) => {
    const { id, value } = e.target;
    switch (id) {
      case Property.LOCATION:
        setLocation(value);
        break;
      case Property.NAME:
        setName(value);
        break;
      default:
        break;
    }
  };

  const onBrowse = async () => {
    const path = await messageHandler.postMessage({
      command: 'browse-for-location-folder'
    });
    if (path) {
      setLocation(path);
    }
  };

  return (
    <div className="bx--grid main-container">
      <div className="bx--row">
        <div className="bx--col-lg-10 bx--col-md-6">
          <div className="main-container__form-item main-container__form-item--flex">
            <TextInput
              type="text"
              id={Property.LOCATION}
              labelText={getHelpTooltip(LOCATION_LABEL, LOCATION_HELP_TEXT)}
              value={location}
              invalid={isLocationValueInvalid(location)}
              invalidText={
                location !== '' && !locationExists
                  ? 'This folder does not exist.'
                  : 'This value is invalid.'
              }
              onChange={onTextInputChange}
              placeholder="Enter the folder location"
            />
            <Button
              kind="tertiary"
              size="field"
              onClick={onBrowse}
              className="main-container__browse-button"
            >
              Browse...
            </Button>
          </div>
          <div className="main-container__form-item--last">
            <TextInput
              type="text"
              id={Property.NAME}
              labelText={getHelpTooltip(NAME_LABEL, NAME_HELP_TEXT)}
              value={name}
              onChange={onTextInputChange}
              placeholder="Enter the name"
            />
          </div>
          {getButtonContainer()}
        </div>
      </div>
    </div>
  );
};

MainContainer.propTypes = {
  params: PropTypes.shape({
    folderPath: PropTypes.string
  }).isRequired
};

export default MainContainer;
