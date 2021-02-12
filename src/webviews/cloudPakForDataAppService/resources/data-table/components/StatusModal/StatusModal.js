import {
  CheckmarkFilled16,
  ErrorFilled16,
  WarningFilled16
} from '@carbon/icons-react';
import { Modal } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';

/**
 * The modal type
 */
export const ModalType = {
  Error: 'error',
  Success: 'success',
  Warning: 'warning'
};

/**
 * Default modal properties
 */
export const DefaultModalProps = {
  isShowing: false,
  type: null,
  title: null,
  description: null
};

export const StatusModal = ({
  isShowingModal,
  onClose,
  type,
  title,
  description
}) => {
  let icon;
  switch (type) {
    case ModalType.Error:
      icon = <ErrorFilled16 className="status-modal__error-icon" />;
      break;
    case ModalType.Success:
      icon = <CheckmarkFilled16 className="status-modal__success-icon" />;
      break;
    case ModalType.Warning:
      icon = <WarningFilled16 className="status-modal__warning-icon" />;
      break;
    default:
      icon = null;
  }
  return (
    <Modal
      // prettier-ignore
      modalHeading={(
        <div className="status-modal__heading-container">
          {icon}
          <div>{title}</div>
        </div>
    )}
      onRequestClose={() => {
        onClose();
      }}
      open={isShowingModal}
      danger
      passiveModal
      size="sm"
    >
      {description}
    </Modal>
  );
};

StatusModal.defaultProps = {
  type: null,
  title: null,
  description: null
};

StatusModal.propTypes = {
  isShowingModal: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.element])
};
