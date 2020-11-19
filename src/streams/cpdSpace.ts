import { InstanceSelector, store } from '@ibmstreams/common';

/**
 * Get the URL for the Cloud Pak for Data space details page
 * @param connectionId the target Streams instance connection identifier
 * @param spaceId the Cloud Pak for Data space identifier
 */
const getCpdSpaceDetailsPageUrl = (
  connectionId: string,
  spaceId: string
): string => {
  const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
    store.getState(),
    connectionId
  );
  return `${cpdUrl}/ml-runtime/spaces/${spaceId}/jobs?context=icp4data`;
};

/**
 * Helper methods for Cloud Pak for Data spaces
 */
const CpdSpace = {
  getCpdSpaceDetailsPageUrl
};

export default CpdSpace;
