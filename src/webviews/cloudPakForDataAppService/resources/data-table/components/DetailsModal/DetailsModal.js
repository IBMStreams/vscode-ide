import {
  Modal,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper
} from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';

const DetailsModal = ({
  isShowingModal,
  setIsShowingModal,
  summary,
  description,
  tags
}) => (
  <Modal
    modalHeading="Details"
    onRequestClose={() => setIsShowingModal(false)}
    open={isShowingModal}
    passiveModal
  >
    <StructuredListWrapper>
      <StructuredListBody>
        <StructuredListRow>
          <StructuredListCell noWrap>Summary</StructuredListCell>
          <StructuredListCell>{summary}</StructuredListCell>
        </StructuredListRow>
        <StructuredListRow>
          <StructuredListCell noWrap>Description</StructuredListCell>
          <StructuredListCell>{description}</StructuredListCell>
        </StructuredListRow>
        <StructuredListRow>
          <StructuredListCell noWrap>Tags</StructuredListCell>
          <StructuredListCell>{tags?.join(', ')}</StructuredListCell>
        </StructuredListRow>
      </StructuredListBody>
    </StructuredListWrapper>
  </Modal>
);

DetailsModal.propTypes = {
  isShowingModal: PropTypes.bool.isRequired,
  setIsShowingModal: PropTypes.func.isRequired,
  summary: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default DetailsModal;
