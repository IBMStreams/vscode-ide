import { InstanceSelector, store } from '@ibmstreams/common';

/**
 * Get the URL for the Cloud Pak for Data project page
 * @param connectionId the target Streams instance connection identifier
 * @param projectId the Cloud Pak for Data project identifier
 */
const getCpdProjectDetailsPageUrl = (
  connectionId: string,
  projectId: string
): string => {
  const cpdUrl = InstanceSelector.selectCloudPakForDataUrl(
    store.getState(),
    connectionId
  );
  return `${cpdUrl}/projects/${projectId}`;
};

/**
 * Helper methods for Cloud Pak for Data projects
 */
const CpdProject = {
  getCpdProjectDetailsPageUrl
};

export default CpdProject;
