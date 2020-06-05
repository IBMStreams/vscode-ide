import InfoIcon16 from '@carbon/icons-react/es/information/16';
import Button from 'carbon-components-react/es/components/Button';
import PropTypes from 'prop-types';
import React from 'react';

const HeaderContainer = ({ bundleName, setIsJobInfoModalOpen }) => {
  return (
    <div className="header-container--flex">
      <h1 className="header-container__header">
        {`Configure job for ${bundleName}`}
      </h1>
      <Button
        hasIconOnly
        kind="ghost"
        renderIcon={InfoIcon16}
        iconDescription="Show job submission details"
        tooltipAlignment="center"
        tooltipPosition="bottom"
        onClick={() => setIsJobInfoModalOpen(true)}
        className="header-container__info-button"
      />
    </div>
  );
};

HeaderContainer.propTypes = {
  bundleName: PropTypes.string.isRequired,
  setIsJobInfoModalOpen: PropTypes.func.isRequired
};

export default HeaderContainer;
