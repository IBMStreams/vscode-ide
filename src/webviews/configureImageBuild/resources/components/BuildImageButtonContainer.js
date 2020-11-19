import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import ButtonContainer from './ButtonContainer';
import { ConfigFileType, NewConfigType } from '../constants';
import BuildImageContext from '../context';
import MessageHandler from '../../../message.ts';

const BuildImageButtonContainer = ({ messageHandler }) => {
  const {
    selectedConfigFileType,
    selectedExistingConfigFile,
    shouldOverrideExistingAppBundles,
    selectedBaseImage,
    imageName,
    imageNameError,
    imageTag,
    imageTagError,
    selectedNewConfigType,
    selectedNewConfigFile
  } = useContext(BuildImageContext);

  const validate = () => {
    // True if errors, false otherwise
    const errors = {
      selectedExistingConfigFile:
        selectedConfigFileType === ConfigFileType.EXISTING &&
        (!selectedExistingConfigFile || !!selectedExistingConfigFile.error),
      selectedNewConfigFile:
        selectedConfigFileType === ConfigFileType.NEW &&
        ((selectedNewConfigType === NewConfigType.SIMPLE &&
          (!selectedBaseImage ||
            !imageName.trim().length ||
            !imageTag.trim().length ||
            imageNameError ||
            imageTagError)) ||
          (selectedNewConfigType === NewConfigType.ADVANCED &&
            !selectedNewConfigFile))
    };
    return errors;
  };

  const isFormValid = () => {
    const errors = validate();
    const isValid = !Object.keys(errors).some((e) => errors[e]);
    return isValid;
  };

  const buildImageArgs = {};
  if (isFormValid()) {
    if (selectedConfigFileType === ConfigFileType.EXISTING) {
      buildImageArgs.configFilePath = selectedExistingConfigFile.filePath;
      buildImageArgs.shouldOverrideExistingAppBundles = shouldOverrideExistingAppBundles;
    } else if (selectedNewConfigType === NewConfigType.SIMPLE) {
      buildImageArgs.baseImage = selectedBaseImage.value;
      buildImageArgs.imageName = imageName;
      buildImageArgs.imageTag = imageTag;
    } else {
      buildImageArgs.configFilePath = selectedNewConfigFile;
    }
  }

  return (
    <ButtonContainer
      primaryBtn={{
        label: 'Build image',
        isValid: isFormValid(),
        onClick: () => {
          messageHandler.postMessage({
            command: 'build-image',
            args: buildImageArgs
          });
        }
      }}
      secondaryBtn={{
        label: 'Cancel',
        isValid: true,
        onClick: () => {
          messageHandler.postMessage({ command: 'close-panel' });
        }
      }}
    />
  );
};

BuildImageButtonContainer.propTypes = {
  messageHandler: PropTypes.instanceOf(MessageHandler).isRequired
};

export default BuildImageButtonContainer;
