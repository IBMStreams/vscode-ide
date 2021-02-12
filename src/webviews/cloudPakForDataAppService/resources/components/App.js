/* eslint-disable no-undef */
import React from 'react';
import Container from './Container';

/**
 * Note: `params` is defined when setting the webview HTML content
 */
const App = () => {
  const { fullPanelTitle, serviceApi, serviceEndpointPath, action } = params;

  return (
    <div className="app-container">
      <div className="bx--grid bx--grid--no-gutter grid--full">
        <div className="bx--row app-container__header-container">
          <div className="bx--col">
            <div className="header-container--flex">
              <h1 className="header-container__header">{fullPanelTitle}</h1>
            </div>
          </div>
        </div>
        <div className="bx--row app-container__main-container">
          <div className="bx--col">
            <Container
              serviceApi={serviceApi}
              serviceEndpointPath={serviceEndpointPath}
              action={action}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
