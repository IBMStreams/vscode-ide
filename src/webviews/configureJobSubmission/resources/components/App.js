/* eslint-disable no-undef */
import React, { useState } from 'react';
import HeaderContainer from './HeaderContainer';
import JobInfoModal from './JobInfoModal';
import SubmitJobContainer from './SubmitJobContainer';

/**
 * Note: `params` is defined when setting the webview HTML content
 */
const App = () => {
  const { details, name, targetInstance } = params;
  const [isJobInfoModalOpen, setIsJobInfoModalOpen] = useState(false);

  return (
    <div className="app-container">
      <JobInfoModal
        isOpen={isJobInfoModalOpen}
        close={() => setIsJobInfoModalOpen(false)}
        instanceName={targetInstance.instanceName}
        jobDetails={details || null}
      />
      <div className="bx--grid bx--grid--no-gutter">
        <div className="bx--row app-container__header-container">
          <div className="bx--col">
            <HeaderContainer
              bundleName={name}
              setIsJobInfoModalOpen={setIsJobInfoModalOpen}
            />
          </div>
        </div>
        <div className="bx--row app-container__main-container">
          <div className="bx--col">
            <SubmitJobContainer params={params} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
