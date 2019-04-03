import * as _ from 'lodash';

const getBody = (response) => {
  console.log('getBody response:', response);
  const body = _.get(response, 'body', {});
  if (body instanceof Buffer) {
    return JSON.parse(body.toString('utf8'));
  }
  if (typeof body === 'string') {
    try {
      const bodyJson = JSON.parse(body);
      return bodyJson;
    } catch (err) {
      // throw away syntax error
    }
  }
  if (body.messages && Array.isArray(body.messages)) {
    console.log('response error, body:', body);
    console.log('response error, messages:', body.messages);

    throw new Error(body.messages.map(entry => entry.message).join('\n'));
  }
  return body;
};

const getRequestObj = (response) => {
  const body = getBody(response);
  return _.get(body, 'requestObj', {});
};

const getBuildId = (response) => {
  const body = getBody(response);
  let build = _.get(body, 'build', null);
  if (build) {
    build = build.split('/').pop();
  }
  return build;
};

const getStatusCode = (response) => {
  return response.resp.statusCode;
};

const getIcp4dAuthToken = (response) => {
  const body = getBody(response);
  return _.get(body, 'token', '');
};

const getStreamsAuthToken = (response) => {
  const body = getBody(response);
  return _.get(body, 'AccessToken', '');
};

const getStreamsInstances = (response) => {
  const requestObj = getRequestObj(response);
  return _.filter(requestObj, instance => instance.ServiceInstanceType === 'streams');
};

const getSelectedInstance = (response, selectedInstanceName) => {
  const instances = getStreamsInstances(response);
  return instances.find(instance => instance.ServiceInstanceDisplayName === selectedInstanceName);
};

const getBuildStatus = (response) => {
  const body = getBody(response);
  const {
    id,
    creationTime,
    creationUser,
    lastActivityTime,
    name,
    processingStartTime,
    processingEndTime,
    status,
    submitCount
  } = body;
  return {
    buildId: id,
    creationTime,
    creationUser,
    lastActivityTime,
    name,
    processingStartTime,
    processingEndTime,
    status,
    submitCount
  };
};

const getBuildArtifacts = (response) => {
  const body = getBody(response);
  return _.get(body, 'artifacts', []);
};

const getSubmitInfo = (response) => {
  const body = getBody(response);
  return body;
};

const getUploadedBundleId = (response) => {
  const body = getBody(response);
  return body.bundleId;
};

const getToolkits = (response) => {
  const body = getBody(response);
  return _.get(body, 'toolkits', []);
};

const ResponseSelector = {
  getStatusCode,

  getIcp4dAuthToken,
  getStreamsAuthToken,
  getStreamsInstances,
  getSelectedInstance,

  getBuildId,
  getBuildStatus,
  getBuildArtifacts,

  getUploadedBundleId,

  getSubmitInfo,

  getToolkits
};

export default ResponseSelector;
