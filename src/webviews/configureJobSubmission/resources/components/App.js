/* eslint-disable no-undef */
import ListItem from 'carbon-components-react/es/components/ListItem';
import UnorderedList from 'carbon-components-react/es/components/UnorderedList';
import * as React from 'react';
import SubmitJobContainer from './SubmitJobContainer';

// submitJobParams is defined when setting the webview HTML content
const App = () => (
  <div className="app-container">
    <div className="bx--grid bx--grid--no-gutter">
      <div className="bx--row app-container__row">
        <div className="bx--col">
          <h1 className="app-container__heading">
            {`Configure job for ${submitJobParams.name}`}
          </h1>
          {submitJobParams.details && Object.keys(submitJobParams.details).length
            ? (
              <UnorderedList className="app-container__list">
                {Object.keys(submitJobParams.details).map((label) => (
                  <ListItem key={label}>
                    {`${label}: ${submitJobParams.details[label]}`}
                  </ListItem>
                ))}
                <ListItem>{`Instance: ${submitJobParams.targetInstance.instanceName}`}</ListItem>
              </UnorderedList>
            )
            : (
              <div>
                {`Instance: ${submitJobParams.targetInstance.instanceName}`}
              </div>
            )
          }
        </div>
      </div>
      <div className="bx--row app-container__row app-container__main-container">
        <div className="bx--col">
          <SubmitJobContainer params={submitJobParams} />
        </div>
      </div>
    </div>
  </div>
);

export default App;
