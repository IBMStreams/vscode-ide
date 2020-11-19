/* eslint-disable no-undef */
import Button from 'carbon-components-react/es/components/Button';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import React from 'react';
import CreatePrimitiveOperatorContainer from './CreatePrimitiveOperatorContainer';

/**
 * Note: `params` is defined when setting the webview HTML content
 */
const App = () => {
  const { panelTitle, type } = params;
  const helpUrl =
    type === 'C++'
      ? 'https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/creatingprimitiveoperators.html'
      : 'https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/javaprimitiveoperators.html';

  return (
    <div className="app-container">
      <div className="bx--grid bx--grid--no-gutter">
        <div className="bx--row app-container__header-container">
          <div className="bx--col">
            <div className="header-container--flex">
              <h1 className="header-container__header">{panelTitle}</h1>
              <Tooltip showIcon direction="bottom" iconDescription="Learn more">
                <p>
                  A primitive operator is an operator that is implemented in C++
                  or Java&trade; and that includes an operator model that
                  describes the syntax and semantics of the operator.
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
            <CreatePrimitiveOperatorContainer params={params} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
