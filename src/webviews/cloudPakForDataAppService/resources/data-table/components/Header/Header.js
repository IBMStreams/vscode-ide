import {
  Download16,
  Information16,
  Launch16,
  Renew16,
  Upload16
} from '@carbon/icons-react';
import {
  Button,
  ButtonSet,
  OverflowMenu,
  OverflowMenuItem,
  TooltipIcon
} from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { FileChangeType } from 'vscode-languageserver-protocol';
import { ACTION, DataUtils, FILE_TYPE } from '../../utils';
import { useApp } from '../App/context';
import DetailsModal from '../DetailsModal';
import { DefaultModalProps, ModalType, StatusModal } from '../StatusModal';

const Header = ({
  openServiceApiUrl,
  importFile,
  exportFile,
  receiveData,
  serviceName,
  serviceEndpointPath,
  serviceEndpointPathObj,
  action,
  schema
}) => {
  const { data, setData, setIsLoading } = useApp();

  const [isShowingDetailsModal, setIsShowingDetailsModal] = useState(false);
  const [modalProps, setModalProps] = useState(DefaultModalProps);

  const handleImportFile = async () => {
    const file = await importFile();
    if (file) {
      // TODO: ask user if they want to append or replace (for now append); check for duplicates?
      const { fileContents, fileType } = file;
      const result =
        fileType === FILE_TYPE.JSON
          ? DataUtils.transformDataFromJson(fileContents)
          : DataUtils.transformDataFromCsv(fileContents);
      if (result.error) {
        setModalProps({
          isShowing: true,
          type: ModalType.Error,
          title: `Error importing the ${fileType.toUpperCase()} file`,
          description: result.error
        });
      } else if (!result.data.length) {
        setModalProps({
          isShowing: true,
          type: ModalType.Warning,
          title: `There is no data to import from the ${fileType.toUpperCase()} file`
        });
      } else {
        // Discard data where key/header doesn't match schema
        const keysToDiscard = [];
        const dataSchemaKeys = Object.keys(schema);
        Object.keys(result.data[0]).forEach((key) => {
          if (!dataSchemaKeys.includes(key)) {
            keysToDiscard.push(key);
          }
        });
        result.data.forEach((dataItem) => {
          keysToDiscard.forEach((key) => {
            // eslint-disable-next-line no-param-reassign
            delete dataItem[key];
          });
        });
        // If there is not an exact match for the schema, then show an error
        if (Object.keys(result.data[0]).length !== dataSchemaKeys.length) {
          const errorDescription = (
            <div>
              The keys do not match the schema: {dataSchemaKeys.join(', ')}.
              {fileType === FILE_TYPE.CSV && (
                <>
                  <br />
                  <br />
                  Note: A header row is required.
                </>
              )}
            </div>
          );
          setModalProps({
            isShowing: true,
            type: ModalType.Error,
            title: `Error importing the ${fileType.toUpperCase()} file`,
            description: errorDescription
          });
        } else {
          setData([...result.data, ...data]);
        }
      }
    }
  };

  const handleExportFile = async (fileType) => {
    let transformData = [...data];
    // Sort oldest to newest when retrieving data
    transformData =
      action === ACTION.RECEIVE ? transformData.reverse() : transformData;
    const fileContents =
      fileType === FILE_TYPE.JSON
        ? DataUtils.transformDataToJson(transformData)
        : DataUtils.transformDataToCsv(transformData);
    return exportFile(fileContents, fileType);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    const { data: responseData, error } = await receiveData();
    if (error) {
      setModalProps({
        isShowing: true,
        type: ModalType.Error,
        title: `Error refreshing the data`,
        description: error
      });
    } else {
      // Sort newest to oldest
      setData(responseData.reverse());
    }
    setIsLoading(false);
  };

  return (
    <>
      <DetailsModal
        isShowingModal={isShowingDetailsModal}
        setIsShowingModal={setIsShowingDetailsModal}
        summary={serviceEndpointPathObj.summary}
        description={serviceEndpointPathObj.description}
        tags={serviceEndpointPathObj.tags}
      />
      <StatusModal
        isShowingModal={modalProps.isShowing}
        onClose={() => setModalProps(DefaultModalProps)}
        type={modalProps.type}
        title={modalProps.title}
        description={modalProps.description}
      />
      <div className="header-container">
        <div>
          <div className="header-container__service-name">
            {serviceName}
            <TooltipIcon
              className="header-container__button"
              onClick={() => openServiceApiUrl()}
              tooltipText="Open API documentation"
            >
              <Launch16 />
            </TooltipIcon>
          </div>
          <div className="header-container__api-endpoint-path-container">
            <div className="header-container__api-endpoint-path">
              {serviceEndpointPath}
            </div>
            <TooltipIcon
              className="header-container__button"
              onClick={() => setIsShowingDetailsModal(true)}
              tooltipText="Show details"
            >
              <Information16 />
            </TooltipIcon>
          </div>
        </div>
        <ButtonSet className="header-container__button-container">
          <OverflowMenu
            className="header-container__export-button-overflow-menu"
            disabled={data.length === 0}
            menuOptionsClass="header-container__export-button-menu"
            renderIcon={() => (
              <div
                className={`bx--btn bx--btn--secondary ${
                  data.length === 0 ? 'bx--btn--disabled' : ''
                }`}
              >
                Export
                <Upload16 className="bx--btn__icon" />
              </div>
            )}
          >
            <OverflowMenuItem
              itemText={FILE_TYPE.CSV.toUpperCase()}
              onClick={() => {
                handleExportFile(FILE_TYPE.CSV);
              }}
            />
            <OverflowMenuItem
              itemText={FILE_TYPE.JSON.toUpperCase()}
              onClick={() => {
                handleExportFile(FILE_TYPE.JSON);
              }}
            />
          </OverflowMenu>
          {action === ACTION.SEND ? (
            <Button
              iconDescription="Import"
              kind="primary"
              onClick={handleImportFile}
              renderIcon={Download16}
            >
              Import
            </Button>
          ) : (
            <Button
              iconDescription="Refresh"
              kind="primary"
              onClick={handleRefresh}
              renderIcon={Renew16}
            >
              Refresh
            </Button>
          )}
        </ButtonSet>
      </div>
    </>
  );
};

Header.propTypes = {
  openServiceApiUrl: PropTypes.func.isRequired,
  importFile: PropTypes.func.isRequired,
  exportFile: PropTypes.func.isRequired,
  receiveData: PropTypes.func.isRequired,
  serviceName: PropTypes.string.isRequired,
  serviceEndpointPath: PropTypes.string.isRequired,
  serviceEndpointPathObj: PropTypes.objectOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array])
  ).isRequired,
  action: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired
};

export default Header;
