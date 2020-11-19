/* eslint-disable no-undef */
import React from 'react';
import StreamsJobGraphContainer from './StreamsJobGraphContainer';

/**
 * Note: `params` is defined when setting the webview HTML content
 */
const App = () => (
  <div className="app-container">
    <StreamsJobGraphContainer params={params} />
  </div>
);

export default App;
