import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import BuildImageButtonContainer from './BuildImageButtonContainer';
import ConfigOptionsContainer from './ConfigOptionsContainer';
import NewConfigContainer from './NewConfigContainer';
import ExistingConfigContainer from './ExistingConfigContainer';
import { ConfigFileType, NewConfigType } from '../constants';
import BuildImageContext from '../context';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';

// eslint-disable-next-line no-unused-vars
const themeHandler = new ThemeHandler();
const messageHandler = new MessageHandler();

const BuildImageContainer = ({ params: { name, preselectedBaseImage, targetInstance } }) => {
  const [selectedConfigFileType, setSelectedConfigFileType] = useState(ConfigFileType.NEW);
  const [selectedExistingConfigFile, setSelectedExistingConfigFile] = useState(null);
  const [shouldOverrideExistingAppBundles, setShouldOverrideExistingAppBundles] = useState(true);
  const [isLoadingBaseImages, setIsLoadingBaseImages] = useState(false);
  const [baseImages, setBaseImages] = useState(null);
  const [selectedBaseImage, setSelectedBaseImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [imageTag, setImageTag] = useState('');
  const [selectedNewConfigType, setSelectedNewConfigType] = useState(NewConfigType.SIMPLE);
  const [selectedNewConfigFile, setSelectedNewConfigFile] = useState(null);
  const value = {
    selectedConfigFileType,
    selectedExistingConfigFile,
    shouldOverrideExistingAppBundles,
    isLoadingBaseImages,
    baseImages,
    selectedBaseImage,
    imageName,
    imageTag,
    selectedNewConfigType,
    selectedNewConfigFile,
    setSelectedConfigFileType,
    setSelectedExistingConfigFile,
    setShouldOverrideExistingAppBundles,
    setIsLoadingBaseImages,
    setBaseImages,
    setSelectedBaseImage,
    setImageName,
    setImageTag,
    setSelectedNewConfigType,
    setSelectedNewConfigFile
  };

  // Run when component is mounted
  useEffect(() => {
    messageHandler.postMessage({ command: 'webview-ready' });
  }, []);

  return (
    <BuildImageContext.Provider value={value}>
      <div className="bx--grid bx--grid--no-gutter build-image-container">
        <div className="bx--row build-image-container__section-container build-image-container__config-options-container">
          <div className="bx--col">
            <ConfigOptionsContainer />
          </div>
        </div>
        <div className="bx--row build-image-container__config-container">
          <div className="bx--col">
            {
              selectedConfigFileType === ConfigFileType.EXISTING
                ? <ExistingConfigContainer messageHandler={messageHandler} />
                : <NewConfigContainer messageHandler={messageHandler} preselectedBaseImage={preselectedBaseImage} />
            }
          </div>
        </div>
        <div className="bx--row">
          <div className="bx--col">
            <BuildImageButtonContainer messageHandler={messageHandler} />
          </div>
        </div>
      </div>
    </BuildImageContext.Provider>
  )
};

BuildImageContainer.propTypes = {
  params: PropTypes.shape({
    name: PropTypes.string.isRequired,
    preselectedBaseImage: PropTypes.shape({
      id: PropTypes.string
    }),
    targetInstance: PropTypes.shape({
      instanceName: PropTypes.string
    }).isRequired
  }).isRequired
};

export default BuildImageContainer;
