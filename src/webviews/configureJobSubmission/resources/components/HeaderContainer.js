import DocumentExport16 from '@carbon/icons-react/es/document--export/16';
import DocumentImport16 from '@carbon/icons-react/es/document--import/16';
import InfoIcon16 from '@carbon/icons-react/es/information/16';
import Button from 'carbon-components-react/es/components/Button';
import { FileUploaderButton } from 'carbon-components-react/es/components/FileUploader';
import OverflowMenu from 'carbon-components-react/es/components/OverflowMenu';
import OverflowMenuItem from 'carbon-components-react/es/components/OverflowMenuItem';
import _has from 'lodash/has';
import * as path from 'path';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import MessageHandler from '../../../message.ts';

class FileUploaderItem extends Component {
  closeMenu = () => {}

  render() {
    const { handleJcoChanged } = this.props;
    return (
      <FileUploaderButton
        disableLabelChanges
        labelText="Import job configuration overlay file"
        size="small"
        accept={['application/JSON']}
        onChange={handleJcoChanged}
        className="bx--overflow-menu-options__option header-container__button-menu-file-uploader"
      />
    )
  }
}

FileUploaderItem.propTypes = {
  handleJcoChanged: PropTypes.func.isRequired
};


const HeaderContainer = ({
 bundleName,
 setIsJobInfoModalOpen,
 jcoFiles,
 handleJcoChange,
 exportJco
}) => {
  const messageHandler = new MessageHandler();
  const learnMoreUrl = 'https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.admin.doc/doc/job_configuration_overlays.html';

  const handleJcoChanged = (event) => {
    const reader = new FileReader();
    const jobConfigOverlayFile = event.target.files[0];
    const { name } = jobConfigOverlayFile;
    reader.onload = () => {
      const fileContents = reader.result;
      if (fileContents) {
        try {
          const jobConfig = JSON.parse(fileContents);
          if (_has(jobConfig, 'jobConfigOverlays')) {
            handleJcoChange(jobConfig);
          }

          // Close overflow menu by clicking on the app container
          const bodyEl = document.getElementsByClassName('app-container');
          if (bodyEl && bodyEl.length) {
            bodyEl[0].click();
          }
        } catch (err) {
          messageHandler.postMessage({
            command: 'show-notification',
            args: {
              type: 'error',
              message: `An error occurred while parsing the job configuration file ${name}.\n${err}`
            }
          });
        }
      }
    };
    reader.readAsText(jobConfigOverlayFile);
  };

  const getImportButton = () => {
    return (
      <OverflowMenu
        iconDescription="Import"
        renderIcon={DocumentImport16}
        flipped
        menuOptionsClass="header-container__button-menu"
      >
        <FileUploaderItem
          handleJcoChanged={handleJcoChanged}
        />
        {jcoFiles.map(({ filePath, fileContent }) => (
          <OverflowMenuItem
            key={filePath}
            itemText={`Import ${path.basename(filePath)}`}
            onClick={() => handleJcoChange(fileContent)}
          />
        ))}
        <OverflowMenuItem
          hasDivider
          itemText="Learn more about job configuration overlay files"
          href={learnMoreUrl}
        />
      </OverflowMenu>
    );
  };

  const getExportButton = () => {
    return (
      <OverflowMenu
        iconDescription="Export"
        renderIcon={DocumentExport16}
        flipped
        menuOptionsClass="header-container__button-menu"
      >
        <OverflowMenuItem
          itemText="Export job configuration overlay file"
          onClick={() => exportJco()}
        />
        <OverflowMenuItem
          hasDivider
          itemText="Learn more about job configuration overlay files"
          href={learnMoreUrl}
        />
      </OverflowMenu>
    );
  };

  return (
    <div className="header-container--flex">
      <div className="header-container--flex-left">
        <h1 className="header-container__header">
          {`Configure job for ${bundleName}`}
        </h1>
        <Button
          hasIconOnly
          kind="ghost"
          renderIcon={InfoIcon16}
          iconDescription="Show job submission details"
          tooltipAlignment="center"
          tooltipPosition="bottom"
          onClick={() => setIsJobInfoModalOpen(true)}
          className="header-container__info-button"
        />
      </div>
      <div className="header-container--flex-right">
        {getImportButton()}
        {getExportButton()}
      </div>
    </div>
  );
};

HeaderContainer.propTypes = {
  bundleName: PropTypes.string.isRequired,
  setIsJobInfoModalOpen: PropTypes.func.isRequired,
  jcoFiles: PropTypes.arrayOf(PropTypes.shape({
    filePath: PropTypes.string,
    fileContent: PropTypes.object
  })).isRequired,
  handleJcoChange: PropTypes.func.isRequired,
  exportJco: PropTypes.func.isRequired
};

export default HeaderContainer;
