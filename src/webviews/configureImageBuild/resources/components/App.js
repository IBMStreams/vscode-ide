/* eslint-disable no-undef */
import React, { useState } from 'react';
import HeaderContainer from './HeaderContainer';
import InfoModal from './InfoModal';
import BuildImageContainer from './BuildImageContainer';

/**
 * Note: `params` is defined when setting the webview HTML content
 */
const App = () => {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  return (
    <div className="app-container">
      <InfoModal
        isOpen={isInfoModalOpen}
        close={() => setIsInfoModalOpen(false)}
        instanceName={params.targetInstance.instanceName}
        details={params.details || null}
      />
      <div className="bx--grid bx--grid--no-gutter">
        <div className="bx--row app-container__header-container">
          <div className="bx--col">
            <HeaderContainer
              bundleName={params.name}
              setIsInfoModalOpen={setIsInfoModalOpen}
            />
          </div>
        </div>
        <div className="bx--row app-container__main-container">
          <div className="bx--col">
            <BuildImageContainer params={params} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
