/* eslint-disable no-undef */
import * as React from 'react';
import SelectInstanceContainer from './SelectInstanceContainer';
import FilePathsContainer from './FilePathsContainer';

// selectInstancePanelTitle and SelectInstanceContainerParams is defined when setting the webview HTML content
const App = () => (
  <div className="app-container">
    <div className="bx--grid bx--grid--no-gutter">
      <div className="bx--row app-container__row">
        <div className="bx--col">
          <h1 className="app-container__heading">
            {selectInstancePanelTitle}
            <FilePathsContainer params={filePathsContainerParams} />
          </h1>
        </div>
      </div>
      <div className="bx--row app-container__row app-container__main-container">
        <div className="bx--col">
          <SelectInstanceContainer params={selectInstanceContainerParams} />
        </div>
      </div>
    </div>
  </div>
);

export default App;
