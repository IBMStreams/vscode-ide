import Modal from 'carbon-components-react/es/components/Modal';
import {
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper
} from 'carbon-components-react/es/components/StructuredList';
import PropTypes from 'prop-types';
import React from 'react';

const InfoModal = ({
 isOpen, close, instanceName, details
}) => {
  const getLabel = (key) => {
    switch (key) {
      case 'bundlePath':
        return 'Bundle path';
      case 'bundleUrl':
        return 'Bundle URL';
      default:
        return null;
    }
  };

  return (
    <Modal
      iconDescription="Close"
      modalAriaLabel="Edge application image build details modal"
      modalHeading="Edge application image build details"
      open={isOpen}
      size="lg"
      passiveModal
      onRequestClose={close}
    >
      <div className="details-container">
        <StructuredListWrapper className="details-container__list">
          <StructuredListBody>
            {
              details && Object.keys(details).length && Object.keys(details).map((key) => {
                const label = getLabel(key);
                return label
                  ? (
                    <StructuredListRow className="structured-row" key={key}>
                      <StructuredListCell noWrap>{label}</StructuredListCell>
                      <StructuredListCell className="details-container__list-value">{details[key]}</StructuredListCell>
                    </StructuredListRow>
                  )
                  : null;
              }).filter((el) => el !== null)
            }
            <StructuredListRow className="structured-row">
              <StructuredListCell noWrap>Instance</StructuredListCell>
              <StructuredListCell className="details-container__list-value">{instanceName}</StructuredListCell>
            </StructuredListRow>
          </StructuredListBody>
        </StructuredListWrapper>
      </div>
    </Modal>
  );
};

InfoModal.defaultProps = {
  details: null
};

InfoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  instanceName: PropTypes.string.isRequired,
  details: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object]))
};

export default InfoModal;
