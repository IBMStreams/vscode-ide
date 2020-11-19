/* eslint-disable no-undef */
import React from 'react';
import SelectInstanceContainer from './SelectInstanceContainer';
import FilePathsContainer from './FilePathsContainer';

/**
 * Note: `params` is defined when setting the webview HTML content
 */
const App = () => {
  const { panelTitle } = params;

  return (
    <div className="app-container">
      <div className="bx--grid bx--grid--no-gutter">
        <div className="bx--row app-container__header-container">
          <div className="bx--col">
            <div>
              <h1 className="header-container__header">{panelTitle}</h1>
              <FilePathsContainer params={params} />
            </div>
          </div>
        </div>
        <div className="bx--row app-container__main-container">
          <div className="bx--col">
            <SelectInstanceContainer params={params} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
