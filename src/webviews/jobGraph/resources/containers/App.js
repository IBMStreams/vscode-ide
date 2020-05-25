/* eslint-disable no-undef */
import * as React from 'react';
import StreamsJobGraphContainer from './StreamsJobGraphContainer';

// jobGraphContainerParams is defined when setting the webview HTML content
const App = () => (
  <div className="app-container">
    <StreamsJobGraphContainer params={jobGraphContainerParams} />
  </div>
);

export default App;
