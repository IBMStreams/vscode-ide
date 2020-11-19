/* eslint-disable no-undef */
import Button from 'carbon-components-react/es/components/Button';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import React from 'react';
import MainContainer from './MainContainer';

/**
 * Note: `params` is defined when setting the webview HTML content
 */
const App = () => {
  const { panelTitle } = params;
  const helpUrl =
    'https://ibmstreams.github.io/vscode-ide/docs/developing-spl-applications/#creating-a-spl-application';

  return (
    <div className="app-container">
      <div className="bx--grid bx--grid--no-gutter">
        <div className="bx--row app-container__header-container">
          <div className="bx--col">
            <div className="header-container--flex">
              <h1 className="header-container__header">{panelTitle}</h1>
              <Tooltip showIcon direction="bottom" iconDescription="Learn more">
                <p>
                  A stream processing application is a collection of operators,
                  all of which process streams of data. Typically, Streams
                  Processing Language (SPL) is used for creating Streams
                  applications.
                </p>
                <div className="bx--tooltip__footer">
                  <Button kind="primary" size="small" href={helpUrl}>
                    Learn more
                  </Button>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="bx--row app-container__main-container">
          <div className="bx--col">
            <MainContainer params={params} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
