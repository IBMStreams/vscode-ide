/* eslint-disable no-undef */
import React, { useState } from 'react';
import HeaderContainer from './HeaderContainer';
import JobInfoModal from './JobInfoModal';
import SubmitJobContainer from './SubmitJobContainer';

/**
 * Note: `submitJobParams` is defined when setting the webview HTML content
 */
const App = () => {
  const [isJobInfoModalOpen, setIsJobInfoModalOpen] = useState(false);
  let submitJobContainerRef;

  return (
    <div className="app-container">
      <JobInfoModal
        isOpen={isJobInfoModalOpen}
        close={() => setIsJobInfoModalOpen(false)}
        instanceName={submitJobParams.targetInstance.instanceName}
        jobDetails={submitJobParams.details || null}
      />
      <div className="bx--grid bx--grid--no-gutter">
        <div className="bx--row app-container__header-container">
          <div className="bx--col">
            <HeaderContainer
              bundleName={submitJobParams.name}
              setIsJobInfoModalOpen={setIsJobInfoModalOpen}
              jcoFiles={submitJobParams.jcoFiles}
              handleJcoChange={(jobConfig) => submitJobContainerRef.handleJobConfigFileChanged(jobConfig)}
              exportJco={() => submitJobContainerRef.exportJCO()}
            />
          </div>
        </div>
        <div className="bx--row app-container__main-container">
          <div className="bx--col">
            <SubmitJobContainer
              params={submitJobParams}
              ref={(instance) => { submitJobContainerRef = instance; }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
