import Button from 'carbon-components-react/es/components/Button';
import Checkbox from 'carbon-components-react/es/components/Checkbox';
import { FileUploaderItem } from 'carbon-components-react/es/components/FileUploader';
import Link from 'carbon-components-react/es/components/Link';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import * as path from 'path';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import BuildImageContext from '../context';
import MessageHandler from '../../../message.ts';

const ExistingConfigContainer = ({ messageHandler }) => {
  const {
    selectedExistingConfigFile,
    shouldOverrideExistingAppBundles,
    setSelectedExistingConfigFile,
    setShouldOverrideExistingAppBundles
  } = useContext(BuildImageContext);

  const docLink =
    'https://ibmstreams.github.io/vscode-ide/docs/building-edge-applications/#build-configuration-properties';

  const handleBrowse = async () => {
    const configFile = await messageHandler.postMessage({
      command: 'browse-for-buildconfig-json'
    });
    if (configFile) {
      const { filePath, error, errorLink } = configFile;
      setSelectedExistingConfigFile({ filePath, error, errorLink });
    }
  };

  const overrideTooltip = (
    <Tooltip
      triggerText={
        <span>
          Override <code>applicationBundles</code> property
        </span>
      }
      iconDescription="Override applicationBundles property"
      direction="right"
      tabIndex={0}
      className="build-image-container__help-tooltip"
    >
      <p>
        The <code>applicationBundles</code> property identifies one or more
        Streams application bundles (<code>.sab</code>) that are to be included
        in the image. If checked, this property will be replaced with the bundle
        information for the selected bundle.
      </p>
      <div className="bx--tooltip__footer">
        <Button kind="primary" size="small" href={docLink}>
          Learn more
        </Button>
      </div>
    </Tooltip>
  );

  return (
    <div className="existing-config-container">
      <div className="bx--grid existing-config-container__form">
        <div className="bx--row existing-config-container__row">
          <div className="bx--col">
            <>
              <div className="existing-config-container__browse-button-container">
                <Button
                  kind="tertiary"
                  size="field"
                  onClick={handleBrowse}
                  className="existing-config-container__browse-button-container__button"
                >
                  Browse...
                </Button>
                <Tooltip
                  showIcon
                  direction="bottom"
                  iconDescription="Learn more"
                >
                  <p>
                    An image build configuration file allows you to customize
                    the edge application image build.
                  </p>
                  <div className="bx--tooltip__footer">
                    <Button kind="primary" size="small" href={docLink}>
                      Learn more
                    </Button>
                  </div>
                </Tooltip>
              </div>
              {selectedExistingConfigFile && (
                <div className="existing-config-container__file-uploader-item">
                  <FileUploaderItem
                    errorBody={
                      selectedExistingConfigFile.errorLink ? (
                        <span>
                          {selectedExistingConfigFile.error}
                          <Link
                            href={docLink}
                            className="existing-config-container__file-uploader-item__link"
                          >
                            here
                          </Link>
                          .
                        </span>
                      ) : (
                        selectedExistingConfigFile.error
                      )
                    }
                    errorSubject="File could not be imported. Import a different file."
                    iconDescription={null}
                    invalid={!!selectedExistingConfigFile.error}
                    name={path.basename(selectedExistingConfigFile.filePath)}
                    status="edit"
                    onDelete={() => {
                      setSelectedExistingConfigFile(null);
                    }}
                  />
                </div>
              )}
            </>
          </div>
        </div>
        <div className="bx--row existing-config-container__row">
          <div className="bx--col">
            <Checkbox
              id="override-application-bundles-checkbox"
              checked={shouldOverrideExistingAppBundles}
              labelText={overrideTooltip}
              onChange={(checked) => {
                setShouldOverrideExistingAppBundles(checked);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

ExistingConfigContainer.propTypes = {
  messageHandler: PropTypes.instanceOf(MessageHandler).isRequired
};

export default ExistingConfigContainer;
