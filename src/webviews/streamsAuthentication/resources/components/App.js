/* eslint-disable no-undef */
import React from 'react';
import StreamsAuthContainer from './StreamsAuthContainer';

/**
 * Note: `streamsAuthPanelTitle` and `streamsAuthContainerParams` are defined when
 * setting the webview HTML content
 */
const App = () => (
  <div className="app-container">
    <div className="bx--grid bx--grid--no-gutter">
      <div className="bx--row app-container__header-container">
        <div className="bx--col">
          <div>
            <h1 className="header-container__header">
              {streamsAuthPanelTitle}
            </h1>
          </div>
        </div>
      </div>
      <div className="bx--row app-container__main-container">
        <div className="bx--col">
          <StreamsAuthContainer params={streamsAuthContainerParams} />
        </div>
      </div>
    </div>
  </div>
);

export default App;
