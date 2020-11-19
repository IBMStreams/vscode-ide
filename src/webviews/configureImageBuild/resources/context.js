import { createContext } from 'react';
import { ConfigFileType } from './constants';

const BuildImageContext = createContext({
  selectedConfigFileType: ConfigFileType.EXISTING,
  selectedExistingConfigFile: null,
  shouldOverrideExistingAppBundles: true,
  isLoadingBaseImages: false,
  baseImages: null,
  selectedBaseImage: null,
  imageName: '',
  imageNameError: false,
  imageTag: '',
  imageTagError: false,
  selectedNewConfigType: null,
  selectedNewConfigFile: null,
  setSelectedConfigFileType: () => {},
  setSelectedExistingConfigFile: () => {},
  setShouldOverrideExistingAppBundles: () => {},
  setIsLoadingBaseImages: () => {},
  setBaseImages: () => {},
  setSelectedBaseImage: () => {},
  setImageName: () => {},
  setImageNameError: () => {},
  setImageTag: () => {},
  setImageTagError: () => {},
  setSelectedNewConfigType: () => {},
  setSelectedNewConfigFile: () => {}
});

export default BuildImageContext;
