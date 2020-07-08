/* eslint-disable no-undef */
import React from 'react';
import SelectInstanceContainer from './SelectInstanceContainer';
import FilePathsContainer from './FilePathsContainer';

/**
 * Note: `selectInstancePanelTitle` and `selectInstanceContainerParams` are defined when
 * setting the webview HTML content
 */
const App = () => (
  <div className="app-container">
    <div className="bx--grid bx--grid--no-gutter">
      <div className="bx--row app-container__header-container">
        <div className="bx--col">
          <div>
            <h1 className="header-container__header">
              {selectInstancePanelTitle}
            </h1>
            <FilePathsContainer params={filePathsContainerParams} />
          </div>
        </div>
      </div>
      <div className="bx--row app-container__main-container">
        <div className="bx--col">
          <SelectInstanceContainer params={selectInstanceContainerParams} />
        </div>
      </div>
    </div>
  </div>
);

export default App;
