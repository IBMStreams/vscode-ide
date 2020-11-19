import Add16Icon from '@carbon/icons-react/es/add/16';
import Button from 'carbon-components-react/es/components/Button';
import ComboBox from 'carbon-components-react/es/components/ComboBox';
import DropdownSkeleton from 'carbon-components-react/es/components/Dropdown/Dropdown.Skeleton';
import { FileUploaderItem } from 'carbon-components-react/es/components/FileUploader';
import FormLabel from 'carbon-components-react/es/components/FormLabel';
import Link from 'carbon-components-react/es/components/Link';
import RadioButton from 'carbon-components-react/es/components/RadioButton';
import RadioButtonGroup from 'carbon-components-react/es/components/RadioButtonGroup';
import TextInput from 'carbon-components-react/es/components/TextInput';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import * as path from 'path';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';
import { NewConfigType } from '../constants';
import BuildImageContext from '../context';
import MessageHandler from '../../../message.ts';

const SEPARATOR_REGEX = '(?:[.]|_{1,2}|-+)';
const IMAGE_NAME_MAX_LENGTH = 255;
const IMAGE_NAME_REGEX = new RegExp(
  `(?:^${SEPARATOR_REGEX})|[^a-z0-9._-]|(?:_{3,})|(?:${SEPARATOR_REGEX}$)`
);
const IMAGE_TAG_MAX_LENGTH = 128;
const IMAGE_TAG_REGEX = new RegExp(`(?:^[.-])|[^A-Za-z0-9_.-]`);

const NewConfigContainer = ({ messageHandler, preselectedBaseImage }) => {
  const {
    isLoadingBaseImages,
    baseImages,
    selectedBaseImage,
    imageName,
    imageNameError,
    imageTag,
    imageTagError,
    selectedNewConfigType,
    selectedNewConfigFile,
    setIsLoadingBaseImages,
    setBaseImages,
    setSelectedBaseImage,
    setImageName,
    setImageNameError,
    setImageTag,
    setImageTagError,
    setSelectedNewConfigType,
    setSelectedNewConfigFile
  } = useContext(BuildImageContext);

  // Run when component is mounted
  useEffect(() => {
    // Get base images
    setIsLoadingBaseImages(true);
  }, []);

  // Get base images when isLoadingBaseImages = true
  useEffect(() => {
    async function getBaseImages() {
      const images = await messageHandler.postMessage({
        command: 'get-base-images'
      });
      if (images) {
        setBaseImages(images);
        if (preselectedBaseImage && !selectedBaseImage) {
          const matchingImage =
            images.find((image) => image.id === preselectedBaseImage.id) ||
            null;
          if (matchingImage) {
            const { id } = matchingImage;
            setSelectedBaseImage({ id, text: id, value: matchingImage });
          }
        }
      }
      setIsLoadingBaseImages(false);
    }

    if (isLoadingBaseImages) {
      getBaseImages();
    }
  }, [isLoadingBaseImages]);

  // Validate the image name
  useEffect(() => {
    let error = false;
    if (imageName.trim() !== '') {
      if (imageName.length > IMAGE_NAME_MAX_LENGTH) {
        // Exceeds maximum length
        error = `The name must not exceed ${IMAGE_NAME_MAX_LENGTH} characters.`;
      } else if (IMAGE_NAME_REGEX.test(imageName)) {
        // Contains invalid characters
        error = `The name may only contain lowercase letters, digits, and separators.
          A separator is defined as a period, one or two underscores, or one or more
          dashes. The name may not start or end with a separator.`;
      }
    }
    setImageNameError(error);
  }, [imageName]);

  // Validate the image tag
  useEffect(() => {
    let error = false;
    if (imageTag.trim() !== '') {
      if (imageTag.length > IMAGE_TAG_MAX_LENGTH) {
        // Exceeds maximum length
        error = `The tag must not exceed ${IMAGE_TAG_MAX_LENGTH} characters.`;
      } else if (IMAGE_TAG_REGEX.test(imageTag)) {
        // Contains invalid characters
        error = `The tag must be valid ASCII and may contain lowercase and uppercase letters,
          digits, underscores, periods, and dashes. The tag may not start with a period or a dash.`;
      }
    }
    setImageTagError(error);
  }, [imageTag]);

  const getHelpTooltip = (label, tooltipText) => {
    return (
      <Tooltip
        triggerText={label}
        iconDescription={label}
        direction="right"
        tabIndex={0}
        className="build-image-container__help-tooltip"
      >
        {tooltipText}
      </Tooltip>
    );
  };

  const getBaseImageOptions = () => {
    const baseImagesOptions = baseImages.map((baseImage) => {
      const { id } = baseImage;
      return { id, text: id, value: baseImage };
    });
    return baseImagesOptions;
  };

  const validate = () => {
    // True if errors, false otherwise
    const errors = {
      selectedBaseImage: !selectedBaseImage,
      imageName: !imageName.trim().length,
      imageTag: !imageTag.trim().length
    };
    return errors;
  };

  const isFormValid = () => {
    const errors = validate();
    const isValid = !Object.keys(errors).some((e) => errors[e]);
    return isValid;
  };

  const handleCreateSample = async () => {
    const configFilePath = await messageHandler.postMessage({
      command: 'create-sample-buildconfig-json',
      args: {
        baseImage: selectedBaseImage.value,
        imageName,
        imageTag
      }
    });
    setSelectedNewConfigFile(configFilePath);
  };

  let dropdownLabel = 'Select a base image';
  let dropdownItems = [];
  let selectedDropdownItem = null;
  if (isLoadingBaseImages) {
    dropdownLabel = 'Loading base images...';
  } else if (baseImages) {
    if (baseImages.length) {
      dropdownItems = getBaseImageOptions();
      selectedDropdownItem = selectedBaseImage
        ? dropdownItems.find(
            (baseImage) => baseImage.text === selectedBaseImage.id
          )
        : null;
    } else {
      dropdownLabel = 'There are no base images available';
    }
  }

  const configurationTypeLabel = (
    <div>
      Selecting <strong>Simple</strong> will automatically create the
      configuration file and start the edge application image build.
      <br />
      <br />
      Selecting <strong>Advanced</strong> will allow you to further customize
      the edge application image build.
    </div>
  );

  const docLink = (
    <Link
      href="https://ibmstreams.github.io/vscode-ide/docs/building-edge-applications/#build-configuration-properties"
      className="new-config-container__instructions__link"
    >
      documentation
    </Link>
  );

  return (
    <div className="new-config-container">
      <div className="bx--grid new-config-container__form">
        <div className="bx--row new-config-container__row">
          <div className="bx--col">
            {isLoadingBaseImages ? (
              <>
                <FormLabel>
                  {getHelpTooltip(
                    'Base image',
                    'The base image used to create the edge application image.'
                  )}
                </FormLabel>
                <DropdownSkeleton />
              </>
            ) : (
              <ComboBox
                ariaLabel="Base image combo box"
                className="new-config-container__base-image-combobox"
                id="base-image-combobox"
                itemToString={(item) => (item ? item.text : '')}
                items={dropdownItems}
                onChange={(e) => {
                  setSelectedBaseImage(e.selectedItem);
                }}
                placeholder={dropdownLabel}
                selectedItem={selectedDropdownItem}
                titleText={getHelpTooltip(
                  'Base image',
                  'The base image used to create the edge application image.'
                )}
              />
            )}
          </div>
        </div>
        <div className="bx--row new-config-container__row">
          <div className="bx--col">
            <TextInput
              type="text"
              id="imageName"
              labelText={getHelpTooltip(
                'Image name',
                'The name of the edge application image.'
              )}
              value={imageName}
              placeholder="Enter the image name"
              invalid={!!imageNameError}
              invalidText={imageNameError}
              onChange={(e) => {
                setImageName(e.target.value);
              }}
            />
          </div>
          <div className="bx--col">
            <TextInput
              type="text"
              id="imageTag"
              labelText={getHelpTooltip(
                'Image tag',
                'The tag of the edge application image.'
              )}
              value={imageTag}
              placeholder="Enter the image tag"
              invalid={!!imageTagError}
              invalidText={imageTagError}
              onChange={(e) => {
                setImageTag(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="bx--row new-config-container__row">
          <div className="bx--col">
            <FormLabel>
              {getHelpTooltip('Configuration type', configurationTypeLabel)}
            </FormLabel>
            <RadioButtonGroup
              name="radio-button-group-new-config-type"
              onChange={(value) => {
                setSelectedNewConfigType(value);
              }}
              orientation="horizontal"
              valueSelected={selectedNewConfigType}
            >
              <RadioButton
                id={NewConfigType.SIMPLE}
                labelText="Simple"
                value={NewConfigType.SIMPLE}
              />
              <RadioButton
                id={NewConfigType.ADVANCED}
                labelText="Advanced"
                value={NewConfigType.ADVANCED}
              />
            </RadioButtonGroup>
          </div>
        </div>
        {selectedNewConfigType === NewConfigType.ADVANCED && (
          <>
            <div className="bx--row new-config-container__row">
              <div className="bx--col">
                <div className="new-config-container__instructions">
                  Click on the button below to create a sample image build
                  configuration file. To customize the image, add properties
                  such as <code>pipPackages</code> and <code>rpms</code> to the
                  configuration file. Refer to the {docLink} to learn about the
                  supported configuration properties.
                </div>
                <div className="new-config-container__instructions">
                  Once you have completed the configuration, return to this form
                  and click on the <strong>Build image</strong> button to start
                  the build.
                </div>
              </div>
            </div>
            <div className="bx--row new-config-container__row">
              <div className="bx--col">
                <div className="new-config-container__file-container">
                  <div className="new-config-container__create-button">
                    <Button
                      type="submit"
                      kind="tertiary"
                      renderIcon={Add16Icon}
                      disabled={!isFormValid()}
                      onClick={handleCreateSample}
                    >
                      Create sample configuration file
                    </Button>
                  </div>
                  <div className="new-config-container__file-uploader-item">
                    {selectedNewConfigFile && (
                      <FileUploaderItem
                        iconDescription={null}
                        name={path.basename(selectedNewConfigFile)}
                        status="edit"
                        onDelete={() => {
                          setSelectedNewConfigFile(null);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

NewConfigContainer.defaultProps = {
  preselectedBaseImage: null
};

NewConfigContainer.propTypes = {
  messageHandler: PropTypes.instanceOf(MessageHandler).isRequired,
  preselectedBaseImage: PropTypes.shape({
    id: PropTypes.string
  })
};

export default NewConfigContainer;
