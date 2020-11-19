/* eslint-disable no-undef */
import React, { useState } from 'react';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';
import { Provider } from '../context';
import {
  configureRunInitialState,
  configureRunReducer,
  createAndConfigureRunInitialState,
  createAndConfigureRunReducer,
  editInitialState,
  editReducer
} from '../reducers';
import ConfigureRunContainer from './configureRun';
import CreateAndConfigureRunContainer from './createAndConfigureRun';
import EditContainer from './edit';
import HeaderContainer from './HeaderContainer';
import InfoModal from './InfoModal';

// eslint-disable-next-line no-unused-vars
const themeHandler = new ThemeHandler();
const messageHandler = new MessageHandler();

/**
 * Note: `params` is defined when setting the webview HTML content
 */
const App = () => {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const {
    instanceName,
    space,
    project,
    jobName,
    jobAction,
    panelTitle
  } = params;

  let component;
  switch (jobAction) {
    case 'createAndConfigureRun':
      component = (
        <Provider
          reducer={createAndConfigureRunReducer}
          initialState={createAndConfigureRunInitialState}
        >
          <CreateAndConfigureRunContainer
            messageHandler={messageHandler}
            params={params}
          />
        </Provider>
      );
      break;
    case 'edit':
      component = (
        <Provider reducer={editReducer} initialState={editInitialState}>
          <EditContainer messageHandler={messageHandler} params={params} />
        </Provider>
      );
      break;
    case 'configureRun':
      component = (
        <Provider
          reducer={configureRunReducer}
          initialState={configureRunInitialState}
        >
          <ConfigureRunContainer
            messageHandler={messageHandler}
            params={params}
          />
        </Provider>
      );
      break;
    default:
      break;
  }

  return (
    <div className="app-container">
      <InfoModal
        isOpen={isInfoModalOpen}
        close={() => setIsInfoModalOpen(false)}
        instanceName={instanceName}
        spaceName={space ? space.entity.name : null}
        projectName={project ? project.entity.name : null}
        jobName={jobName || null}
      />
      <div className="bx--grid bx--grid--no-gutter">
        <div className="bx--row app-container__header-container">
          <div className="bx--col">
            <HeaderContainer
              panelTitle={panelTitle}
              setIsInfoModalOpen={setIsInfoModalOpen}
            />
          </div>
        </div>
        <div className="bx--row app-container__main-container">
          <div className="bx--col">{component}</div>
        </div>
      </div>
    </div>
  );
};

export default App;
