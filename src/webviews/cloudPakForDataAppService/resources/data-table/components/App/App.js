import { Loading } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import Header from '../Header';
import Table from '../Table';
import './app.scss';
import { ACTION, ParseUtils } from '../../utils';
import ThemeHandler from '../../../../../theme.ts';
import { AppProvider } from './context';

const App = ({
  openServiceApiUrl,
  importFile,
  exportFile,
  receiveData,
  sendData,
  serviceApi,
  serviceEndpointPath,
  action,
  initialData
}) => {
  // eslint-disable-next-line no-unused-vars
  const themeHandler = new ThemeHandler();

  const [isLoading, setIsLoading] = useState(true);
  const [serviceEndpointPathObj, setServiceEndpointPathObj] = useState(null);
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    async function init() {
      const parsedApi = await ParseUtils.parse(serviceApi, serviceEndpointPath);
      setServiceEndpointPathObj(parsedApi);
      setIsLoading(false);

      const schemaStructure =
        action === ACTION.SEND
          ? parsedApi.requestBody.content['application/json'].schema.properties
              .items.items.properties
          : parsedApi.responses['200'].content['application/json'].schema
              .properties.items.items.properties;
      setSchema(schemaStructure);
    }

    init();
  }, [serviceApi, serviceEndpointPath]);

  return (
    <div className="app">
      <AppProvider
        initialData={initialData}
        initialIsLoading={action === ACTION.RECEIVE}
      >
        <Loading active={isLoading} description="Loading..." />
        {!isLoading && schema && (
          <>
            <Header
              openServiceApiUrl={openServiceApiUrl}
              importFile={importFile}
              exportFile={exportFile}
              receiveData={receiveData}
              serviceName={serviceApi.info.title}
              serviceEndpointPath={serviceEndpointPath}
              serviceEndpointPathObj={serviceEndpointPathObj}
              action={action}
              schema={schema}
            />
            <Table
              receiveData={receiveData}
              sendData={sendData}
              action={action}
              schema={schema}
            />
          </>
        )}
      </AppProvider>
    </div>
  );
};

App.defaultProps = {
  initialData: []
};

App.propTypes = {
  openServiceApiUrl: PropTypes.func.isRequired,
  importFile: PropTypes.func.isRequired,
  exportFile: PropTypes.func.isRequired,
  receiveData: PropTypes.func.isRequired,
  sendData: PropTypes.func.isRequired,
  serviceApi: PropTypes.objectOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array])
  ).isRequired,
  serviceEndpointPath: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  initialData: PropTypes.arrayOf(PropTypes.object)
};

export default App;
