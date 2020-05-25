/* eslint-disable no-undef */
import * as React from 'react';
import StreamsAuthContainer from './StreamsAuthContainer';

// streamsAuthPanelTitle and streamsAuthContainerParams is defined when setting the webview HTML content
const App = () => (
  <div className="app-container">
    <div className="bx--grid bx--grid--no-gutter">
      <div className="bx--row app-container__row">
        <div className="bx--col">
          <h1 className="app-container__heading">
            {streamsAuthPanelTitle}
          </h1>
        </div>
      </div>
      <div className="bx--row app-container__row app-container__main-container">
        <div className="bx--col">
          <StreamsAuthContainer params={streamsAuthContainerParams} />
        </div>
      </div>
    </div>
  </div>
);

export default App;
