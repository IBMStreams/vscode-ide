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
  imageTag: '',
  selectedNewConfigType: null,
  selectedNewConfigFile: null,
  setSelectedConfigFileType: () => {},
  setSelectedExistingConfigFile: () => {},
  setShouldOverrideExistingAppBundles: () => {},
  setIsLoadingBaseImages: () => {},
  setBaseImages: () => {},
  setSelectedBaseImage: () => {},
  setImageName: () => {},
  setImageTag: () => {},
  setSelectedNewConfigType: () => {},
  setSelectedNewConfigFile: () => {}
});

export default BuildImageContext;
