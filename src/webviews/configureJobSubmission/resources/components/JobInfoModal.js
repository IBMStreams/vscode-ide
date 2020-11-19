import Modal from 'carbon-components-react/es/components/Modal';
import {
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper
} from 'carbon-components-react/es/components/StructuredList';
import PropTypes from 'prop-types';
import React from 'react';

const JobInfoModal = ({ isOpen, close, instanceName, jobDetails }) => {
  return (
    <Modal
      iconDescription="Close"
      modalAriaLabel="Job submission details modal"
      modalHeading="Job submission details"
      open={isOpen}
      size="lg"
      passiveModal
      onRequestClose={close}
    >
      <div className="job-details-container">
        <StructuredListWrapper className="job-details-container__list">
          <StructuredListBody>
            {jobDetails &&
              Object.keys(jobDetails).length &&
              Object.keys(jobDetails).map((label) => (
                <StructuredListRow className="structured-row" key={label}>
                  <StructuredListCell noWrap>{label}</StructuredListCell>
                  <StructuredListCell className="job-details-container__list-value">
                    {jobDetails[label]}
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            <StructuredListRow className="structured-row">
              <StructuredListCell noWrap>Instance</StructuredListCell>
              <StructuredListCell className="job-details-container__list-value">
                {instanceName}
              </StructuredListCell>
            </StructuredListRow>
          </StructuredListBody>
        </StructuredListWrapper>
      </div>
    </Modal>
  );
};

JobInfoModal.defaultProps = {
  jobDetails: null
};

JobInfoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  instanceName: PropTypes.string.isRequired,
  jobDetails: PropTypes.objectOf(PropTypes.string)
};

export default JobInfoModal;
