const isValid = (jobConfig) => {
  if (jobConfig && Array.isArray(jobConfig.jobConfigOverlays)) {
    if (jobConfig.jobConfigOverlays.length > 0) {
      return true;
    }
  }
  return false;
};

const getOverlay = (jobConfig) => {
  return isValid(jobConfig) ? jobConfig.jobConfigOverlays[0] : null;
};

const getJobConfigSectionElement = (jobConfig, element) => {
  const overlay = getOverlay(jobConfig);
  return overlay && overlay.jobConfig ? overlay.jobConfig[element] : '';
};

const getJobName = (jobConfig) => {
  return getJobConfigSectionElement(jobConfig, 'jobName');
};

const getJobGroup = (jobConfig) => {
  return getJobConfigSectionElement(jobConfig, 'jobGroup');
};

const getDataDirectory = (jobConfig) => {
  return getJobConfigSectionElement(jobConfig, 'dataDirectory');
};

const getTracing = (jobConfig) => {
  return getJobConfigSectionElement(jobConfig, 'tracing');
};

const getSubmissionTimeParameters = (jobConfig) => {
  return getJobConfigSectionElement(jobConfig, 'submissionParameters');
};

const JobConfigOverlayUtils = {
  isValid,
  getJobName,
  getJobGroup,
  getDataDirectory,
  getTracing,
  getSubmissionTimeParameters
};

export default JobConfigOverlayUtils;
