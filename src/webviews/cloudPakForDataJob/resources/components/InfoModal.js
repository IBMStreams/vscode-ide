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
  isOpen,
  close,
  instanceName,
  spaceName,
  projectName,
  jobName
}) => {
  return (
    <Modal
      iconDescription="Close"
      modalAriaLabel="IBM Cloud Pak for Data Streams job details modal"
      modalHeading="IBM Cloud Pak for Data Streams job details"
      open={isOpen}
      size="lg"
      passiveModal
      onRequestClose={close}
    >
      <div className="details-container">
        <StructuredListWrapper className="details-container__list">
          <StructuredListBody>
            <StructuredListRow className="structured-row">
              <StructuredListCell noWrap>Instance</StructuredListCell>
              <StructuredListCell className="details-container__list-value">
                {instanceName}
              </StructuredListCell>
            </StructuredListRow>
            {spaceName && (
              <StructuredListRow className="structured-row">
                <StructuredListCell noWrap>Deployment space</StructuredListCell>
                <StructuredListCell className="details-container__list-value">
                  {spaceName}
                </StructuredListCell>
              </StructuredListRow>
            )}
            {projectName && (
              <StructuredListRow className="structured-row">
                <StructuredListCell noWrap>Project</StructuredListCell>
                <StructuredListCell className="details-container__list-value">
                  {projectName}
                </StructuredListCell>
              </StructuredListRow>
            )}
            {jobName && (
              <StructuredListRow className="structured-row">
                <StructuredListCell noWrap>
                  Job definition name
                </StructuredListCell>
                <StructuredListCell className="details-container__list-value">
                  {jobName}
                </StructuredListCell>
              </StructuredListRow>
            )}
          </StructuredListBody>
        </StructuredListWrapper>
      </div>
    </Modal>
  );
};

InfoModal.defaultProps = {
  spaceName: null,
  jobName: null
};

InfoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  instanceName: PropTypes.string.isRequired,
  spaceName: PropTypes.string,
  projectName: PropTypes.string,
  jobName: PropTypes.string
};

export default InfoModal;
