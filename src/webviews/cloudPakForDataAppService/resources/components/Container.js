import PropTypes from 'prop-types';
import React from 'react';
import ReactDataTable from '../data-table';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';

const Container = ({ serviceApi, serviceEndpointPath, action }) => {
  // eslint-disable-next-line no-unused-vars
  const themeHandler = new ThemeHandler();
  const messageHandler = new MessageHandler();

  const openServiceApiUrl = () => {
    messageHandler.postMessage({
      command: 'open-service-api-url'
    });
  };

  const importFile = async () => {
    return messageHandler.postMessage({
      command: 'import-file'
    });
  };

  const exportFile = async (fileContents, fileType) => {
    return messageHandler.postMessage({
      command: 'export-file',
      args: { fileContents, fileType }
    });
  };

  const receiveData = async () => {
    return messageHandler.postMessage({
      command: 'receive-data'
    });
  };

  const sendData = async (data) => {
    return messageHandler.postMessage({
      command: 'send-data',
      args: { data }
    });
  };

  return (
    <div className="main-container">
      <ReactDataTable
        openServiceApiUrl={openServiceApiUrl}
        importFile={importFile}
        exportFile={exportFile}
        receiveData={receiveData}
        sendData={sendData}
        serviceApi={serviceApi}
        serviceEndpointPath={serviceEndpointPath}
        action={action}
        initialData={[]}
      />
    </div>
  );
};

Container.propTypes = {
  serviceApi: PropTypes.object.isRequired,
  serviceEndpointPath: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired
};

export default Container;
