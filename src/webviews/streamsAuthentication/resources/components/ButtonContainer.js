import ArrowRight16 from '@carbon/icons-react/es/arrow--right/16';
import Renew16 from '@carbon/icons-react/es/renew/16';
import Button from 'carbon-components-react/es/components/Button';
import PropTypes from 'prop-types';
import React from 'react';

const ButtonContainer = ({
  primaryBtn,
  secondaryBtn,
  tertiaryBtn
}) => {
  const primary = (
    <Button
      type="submit"
      kind="primary"
      renderIcon={primaryBtn.showIcon ? ArrowRight16 : null}
      disabled={!primaryBtn.isValid}
      onClick={primaryBtn.onClick}
      className="button-container__button"
    >
      {primaryBtn.label}
    </Button>
  );
  const secondary = secondaryBtn ? (
    <Button
      type="button"
      kind="secondary"
      renderIcon={secondaryBtn.showIcon ? Renew16 : null}
      disabled={!secondaryBtn.isValid}
      onClick={secondaryBtn.onClick}
      className="button-container__button"
    >
      {secondaryBtn.label}
    </Button>
  ) : null;
  const tertiary = tertiaryBtn ? (
    <Button
      type="button"
      kind="tertiary"
      onClick={tertiaryBtn.onClick}
      className="button-container__button"
    >
      {tertiaryBtn.label}
    </Button>
  ) : null;

  return (
    <div className="bx--btn-set button-container">
      {primary}
      {secondary}
      {tertiary}
    </div>
  );
};

ButtonContainer.defaultProps = {
  secondaryBtn: null,
  tertiaryBtn: null
};

ButtonContainer.propTypes = {
  primaryBtn: PropTypes.shape({
    label: PropTypes.string.isRequired,
    showIcon: PropTypes.bool,
    isValid: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired
  }).isRequired,
  secondaryBtn: PropTypes.shape({
    label: PropTypes.string.isRequired,
    showIcon: PropTypes.bool,
    isValid: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
  }),
  tertiaryBtn: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired
  })
};

export default ButtonContainer;
