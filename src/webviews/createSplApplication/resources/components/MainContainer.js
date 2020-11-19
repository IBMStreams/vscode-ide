import Button from 'carbon-components-react/es/components/Button';
import TextInput from 'carbon-components-react/es/components/TextInput';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';
import ButtonContainer from './ButtonContainer';

const APPLICATION_FOLDER_PATH_LABEL = 'Application folder path';
const APPLICATION_FOLDER_PATH_HELP_TEXT =
  'The path of the folder where you want to create the SPL application.';
const NAMESPACE_LABEL = 'Namespace';
const NAMESPACE_HELP_TEXT = 'The namespace of the SPL application.';
const MAIN_COMPOSITE_NAME_LABEL = 'Main composite name';
const MAIN_COMPOSITE_NAME_HELP_TEXT =
  'The main composite name of the SPL application.';

const Property = {
  APPLICATION_FOLDER_PATH: 'applicationFolderPath',
  NAMESPACE: 'namespace',
  MAIN_COMPOSITE_NAME: 'mainCompositeName'
};

const MainContainer = ({ params: { folderPath } }) => {
  // eslint-disable-next-line no-unused-vars
  const themeHandler = new ThemeHandler();
  const messageHandler = new MessageHandler();

  const [applicationFolderPath, setApplicationFolderPath] = useState(
    folderPath || ''
  );
  const [namespace, setNamespace] = useState('');
  const [mainCompositeName, setMainCompositeName] = useState('');
  const [
    applicationFolderPathExists,
    setApplicationFolderPathExists
  ] = useState(true);
  const [namespaceError, setNamespaceError] = useState(false);
  const [mainCompositeNameError, setMainCompositeNameError] = useState(false);

  useEffect(() => {
    const checkIfApplicationFolderPathExists = async () => {
      const exists = await messageHandler.postMessage({
        command: 'check-if-application-folder-exists',
        args: { applicationFolderPath }
      });
      setApplicationFolderPathExists(exists);
    };
    if (applicationFolderPath !== '') {
      checkIfApplicationFolderPathExists();
    } else {
      setApplicationFolderPathExists(true);
    }
  }, [applicationFolderPath]);

  useEffect(() => {
    const checkIfValidNamespace = async () => {
      const isValidNamespaceResult = await messageHandler.postMessage({
        command: 'check-if-valid-namespace',
        args: { namespace }
      });
      if (isValidNamespaceResult !== true) {
        setNamespaceError(isValidNamespaceResult);
      } else {
        setNamespaceError(false);
      }
    };
    if (namespace !== '') {
      checkIfValidNamespace();
    } else {
      setNamespaceError(false);
    }
  }, [namespace]);

  useEffect(() => {
    const checkIfValidMainCompositeName = async () => {
      const isValidMainCompositeNameResult = await messageHandler.postMessage({
        command: 'check-if-valid-main-composite-name',
        args: { mainCompositeName }
      });
      if (isValidMainCompositeNameResult !== true) {
        setMainCompositeNameError(isValidMainCompositeNameResult);
      } else {
        setMainCompositeNameError(false);
      }
    };
    if (mainCompositeName !== '') {
      checkIfValidMainCompositeName();
    } else {
      setMainCompositeNameError(false);
    }
  }, [mainCompositeName]);

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

  const isApplicationFolderPathValueInvalid = () =>
    !applicationFolderPathExists;

  const isNamespaceValueInvalid = () => !!namespaceError;

  const isMainCompositeNameValueInvalid = () => !!mainCompositeNameError;

  const getButtonContainer = () => {
    const isValid =
      applicationFolderPath.trim() !== '' &&
      namespace.trim() !== '' &&
      mainCompositeName.trim() !== '' &&
      !isApplicationFolderPathValueInvalid() &&
      !isNamespaceValueInvalid() &&
      !isMainCompositeNameValueInvalid();
    return (
      <ButtonContainer
        primaryBtn={{
          label: 'Create',
          isValid,
          onClick: () => {
            messageHandler.postMessage({
              command: 'create-spl-application',
              args: {
                [Property.APPLICATION_FOLDER_PATH]: applicationFolderPath,
                [Property.NAMESPACE]: namespace,
                [Property.MAIN_COMPOSITE_NAME]: mainCompositeName
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
      case Property.APPLICATION_FOLDER_PATH:
        setApplicationFolderPath(value);
        break;
      case Property.NAMESPACE:
        setNamespace(value);
        break;
      case Property.MAIN_COMPOSITE_NAME:
        setMainCompositeName(value);
        break;
      default:
        break;
    }
  };

  const onBrowse = async () => {
    const path = await messageHandler.postMessage({
      command: 'browse-for-application-folder'
    });
    if (path) {
      setApplicationFolderPath(path);
    }
  };

  return (
    <div className="bx--grid main-container">
      <div className="bx--row">
        <div className="bx--col-lg-10 bx--col-md-6">
          <div className="main-container__form-item main-container__form-item--flex">
            <TextInput
              type="text"
              id={Property.APPLICATION_FOLDER_PATH}
              labelText={getHelpTooltip(
                APPLICATION_FOLDER_PATH_LABEL,
                APPLICATION_FOLDER_PATH_HELP_TEXT
              )}
              value={applicationFolderPath}
              invalid={isApplicationFolderPathValueInvalid(
                applicationFolderPath
              )}
              invalidText={
                applicationFolderPath !== '' && !applicationFolderPathExists
                  ? 'This folder does not exist.'
                  : 'This value is invalid.'
              }
              onChange={onTextInputChange}
              placeholder="Enter the application folder path"
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
          <div className="main-container__form-item">
            <TextInput
              type="text"
              id={Property.NAMESPACE}
              labelText={getHelpTooltip(NAMESPACE_LABEL, NAMESPACE_HELP_TEXT)}
              value={namespace}
              invalid={isNamespaceValueInvalid()}
              invalidText={
                namespaceError
                  ? `${namespaceError} Namespace must start with an ASCII letter or underscore, followed by ASCII letters, digits, underscores, or period delimiters.`
                  : null
              }
              onChange={onTextInputChange}
              placeholder="Enter the namespace"
            />
          </div>
          <div className="main-container__form-item--last">
            <TextInput
              type="text"
              id={Property.MAIN_COMPOSITE_NAME}
              labelText={getHelpTooltip(
                MAIN_COMPOSITE_NAME_LABEL,
                MAIN_COMPOSITE_NAME_HELP_TEXT
              )}
              value={mainCompositeName}
              invalid={isMainCompositeNameValueInvalid()}
              invalidText={
                mainCompositeNameError
                  ? `${mainCompositeNameError} Name must start with an ASCII letter or underscore, followed by ASCII letters, digits, or underscores.`
                  : null
              }
              onChange={onTextInputChange}
              placeholder="Enter the main composite name"
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
