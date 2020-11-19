import Button from 'carbon-components-react/es/components/Button';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import React from 'react';
import PropTypes from 'prop-types';

const HelpTooltip = ({ label, tooltipText, buttonUrl }) => {
  return (
    <Tooltip
      triggerText={label}
      iconDescription={label}
      direction="right"
      tabIndex={0}
      className="help-tooltip"
    >
      {buttonUrl ? (
        <>
          <p>{tooltipText}</p>
          <div className="bx--tooltip__footer">
            <Button kind="primary" size="small" href={buttonUrl}>
              Learn more
            </Button>
          </div>
        </>
      ) : (
        <>{tooltipText}</>
      )}
    </Tooltip>
  );
};

HelpTooltip.defaultProps = {
  buttonUrl: null
};

HelpTooltip.propTypes = {
  label: PropTypes.string.isRequired,
  tooltipText: PropTypes.oneOfType([PropTypes.string, PropTypes.node])
    .isRequired,
  buttonUrl: PropTypes.string
};

export default HelpTooltip;
