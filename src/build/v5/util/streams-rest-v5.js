import * as path from 'path';
import * as fs from 'fs';

import { Observable } from 'rxjs';

import StateSelector from './state-selectors';
import { inDebugMode, Logger } from '../../../utils';

const request = require('request');

const baseRequestOptions = {
  method: 'GET',
  json: true,
  gzip: true,
  agentOptions: {
    rejectUnauthorized: false
  },
  ecdhCurve: 'auto',
  strictSSL: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
};

const baseRequest = request.defaults(baseRequestOptions);

function setTimeout(timeoutInSeconds) {
  baseRequest.defaults.timeout = timeoutInSeconds * 1000;
}

function getBuildUrl(state) {
  const MAJOR=0;
  const MINOR=1;

  try {
    const version = StateSelector.getServiceInstanceVersion(state).split('.');
    if ( parseInt(version[MAJOR]) >= 5 && parseInt(version[MINOR]) >= 2 ) {
      return StateSelector.getStreamsBuildRestUrl(state);
    }
  } catch {
    Logger.error(null, 'Unable to determine service instance version');
  }
  return `${StateSelector.getStreamsBuildRestUrl(state)}/builds`;  
}

/**
 *  StreamsRestUtils.build
 */

function getAll(state) {
  const options = {
    url: getBuildUrl(state),
    auth: getStreamsAuth(state)
  };
  return observableRequest(baseRequest, options);
}

function getStatus(state, buildId) {  
  const options = {
    url: `${getBuildUrl(state)}/${buildId}`,
    auth: getStreamsAuth(state)
  };
  return observableRequest(baseRequest, options);
}

function create(
  state,
  {
    inactivityTimeout,
    incremental,
    name,
    type
  } = {
    inactivityTimeout: 15,
    incremental: true,
    name: 'myBuild',
    type: 'application'
  }
) {
  const options = {
    method: 'POST',
    url: getBuildUrl(state),
    auth: getStreamsAuth(state),
    body: {
      inactivityTimeout,
      incremental,
      name,
      originator: StateSelector.getBuildOriginator(state) || 'unknown',
      type
    }
  };
  return observableRequest(baseRequest, options);
}

function deleteBuild(state, buildId) {
  const options = {
    method: 'DELETE',
    url: `${getBuildUrl(state)}/${buildId}`,
    auth: getStreamsAuth(state),
    headers: {
      Accept: '*/*'
    }
  };
  return observableRequest(baseRequest, options);
}

function uploadSource(state, buildId, sourceZipPath) {
  const options = {
    method: 'PUT',
    json: false,
    url: `${getBuildUrl(state)}/${buildId}`,
    auth: getStreamsAuth(state),
    headers: {
      'Content-Type': 'application/zip'
    },
    encoding: null,
    body: fs.createReadStream(sourceZipPath)
  };
  return observableRequest(baseRequest, options);
}

function updateSource(state, buildId, sourceZipPath) {
  const options = {
    method: 'PATCH',
    url: `${getBuildUrl(state)}/${buildId}`,
    auth: getStreamsAuth(state),
    headers: {
      'Content-Type': 'application/zip'
    },
    formData: {
      file: {
        value: fs.createReadStream(sourceZipPath),
        options: {
          filename: sourceZipPath.split(path.sep).pop(),
          contentType: 'application/zip'
        }
      }
    }
  };
  return observableRequest(baseRequest, options);
}

function getLogMessages(state, buildId) {
  const options = {
    url: `${getBuildUrl(state)}/${buildId}/logmessages`,
    auth: getStreamsAuth(state),
    json: false,
    headers: {
      Accept: 'text/plain'
    }
  };
  return observableRequest(baseRequest, options);
}

function start(state, buildId, { buildConfigOverrides = {} } = {}) {
  const options = {
    method: 'POST',
    url: `${getBuildUrl(state)}/${buildId}/actions`,
    auth: getStreamsAuth(state),
    body: {
      type: 'submit',
      buildConfigOverrides
    }
  };
  return observableRequest(baseRequest, options);
}

function cancel(state, buildId, { buildConfigOverrides = {} } = {}) {
  const options = {
    method: 'POST',
    url: `${getBuildUrl(state)}/${buildId}/actions`,
    auth: getStreamsAuth(state),
    body: {
      type: 'cancel',
      buildConfigOverrides
    }
  };
  return observableRequest(baseRequest, options);
}

function getSnapshots(state) {
  const options = {
    url: `${getBuildUrl(state)}/snapshot`,
    auth: getStreamsAuth(state)
  };
  return observableRequest(baseRequest, options);
}

/**
 *  StreamsRestUtils.artifact
 */

function getArtifacts(state, buildId) {
  const options = {
    url: `${getBuildUrl(state)}/${buildId}/artifacts`,
    auth: getStreamsAuth(state)
  };
  return observableRequest(baseRequest, options);
}

function getArtifact(state, buildId, artifactId) {
  const options = {
    url: `${getBuildUrl(state)}/${buildId}/artifacts/${artifactId}`,
    auth: getStreamsAuth(state)
  };
  return observableRequest(baseRequest, options);
}

function getAdl(state, buildId, artifactId) {
  const options = {
    url: `${getBuildUrl(state)}/${buildId}/artifacts/${artifactId}/adl`,
    auth: getStreamsAuth(state),
    headers: {
      Accept: 'text/xml'
    }
  };
  return observableRequest(baseRequest, options);
}

function downloadApplicationBundle(state, buildId, artifactId) {
  const options = {
    url: `${getBuildUrl(state)}/${buildId}/artifacts/${artifactId}/applicationbundle`,
    auth: getStreamsAuth(state),
    encoding: null,
    headers: {
      Accept: 'application/x-jar'
    }
  };
  return observableRequest(baseRequest, options);
}

function uploadApplicationBundleToInstance(state, applicationBundlePath) {
  const options = {
    method: 'POST',
    url: `${StateSelector.getStreamsRestUrl(state)}/applicationbundles`,
    auth: getStreamsAuth(state),
    headers: {
      'Content-Type': 'application/x-jar',
      Accept: 'application/json'
    },
    json: false,
    body: fs.createReadStream(applicationBundlePath)
  };
  return observableRequest(baseRequest, options);
}

function submitJob(
  state,
  applicationBundleIdOrUrl,
  {
    applicationCredentials,
    jobConfig,
    jobGroup,
    jobName,
    preview,
    submitParameters
  } = {
    preview: false,
    jobGroup: 'default',
    jobName: 'myJob',
    submitParameters: [],
    jobConfig: {},
    applicationCredentials: {}
  }
) {
  const options = {
    method: 'POST',
    url: `${StateSelector.getStreamsRestUrl(state)}/jobs`,
    auth: getStreamsAuth(state),
    body: {
      application: applicationBundleIdOrUrl,
      preview,
      jobGroup,
      jobName,
      submitParameters,
      jobConfigurationOverlay: jobConfig,
      applicationCredentials: {
        bearerToken: StateSelector.getStreamsBearerToken(state)
      }
    }
  };
  return observableRequest(baseRequest, options);
}

/**
 *  StreamsRestUtils.toolkit
 */

function getToolkits(state) {
  const options = {
    url: `${getBuildUrl(state)}/toolkits`,
    auth: getStreamsAuth(state)
  };
  return observableRequest(baseRequest, options);
}

function getToolkit(state, toolkitId) {
  const options = {
    url: `${getBuildUrl(state)}/toolkits/${toolkitId}`,
    auth: getStreamsAuth(state)
  };
  return observableRequest(baseRequest, options);
}

function addToolkit(state, toolkitZipPath) {
  const options = {
    method: 'POST',
    url: `${getBuildUrl(state)}/toolkits`,
    auth: getStreamsAuth(state),
    headers: {
      'Content-Type': 'application/zip'
    },
    formData: {
      file: {
        value: fs.createReadStream(toolkitZipPath),
        options: {
          filename: toolkitZipPath.split(path.sep).pop(),
          contentType: 'application/x-jar'
        }
      }
    }
  };
  return observableRequest(baseRequest, options);
}

function deleteToolkit(state, toolkitId) {
  const options = {
    method: 'DELETE',
    url: `${getBuildUrl(state)}/toolkits/${toolkitId}`,
    auth: getStreamsAuth(state)
  };
  return observableRequest(baseRequest, options);
}

function getToolkitIndex(state, toolkitId) {
  const options = {
    url: `${getBuildUrl(state)}/toolkits/${toolkitId}/index`,
    auth: getStreamsAuth(state),
    headers: {
      Accept: 'text/xml'
    }
  };
  return observableRequest(baseRequest, options);
}

/**
 *  Helper functions
 */

function icp4dHostExists(state) {
  const options = {
    method: 'HEAD',
    url: StateSelector.getIcp4dUrl(state),
    timeout: 2000
  };
  return observableRequest(baseRequest, options);
}

function getIcp4dToken(state, username, password) {
  const options = {
    method: 'POST',
    url: `${StateSelector.getIcp4dUrl(state)}/icp4d-api/v1/authorize`,
    body: {
      username,
      password
    },
    ecdhCurve: 'auto'
  };
  return observableRequest(baseRequest, options);
}

function getServiceInstances(state) {
  const options = {
    url: `${StateSelector.getIcp4dUrl(state)}/zen-data/v2/serviceInstance`,
    auth: getIcp4dAuth(state)
  };
  return observableRequest(baseRequest, options);
}

function getStreamsAuthToken(state, instanceName) {
  const options = {
    method: 'POST',
    auth: getIcp4dAuth(state),
    url: `${StateSelector.getIcp4dUrl(state)}/zen-data/v2/serviceInstance/token`,
    body: {
      serviceInstanceDisplayname: instanceName
    }
  };
  return observableRequest(baseRequest, options);
}

function observableRequest(requestInst, options) {
  if (inDebugMode()) {
    console.log('request options: ', options);
  }
  return Observable.create((req) => {
    requestInst(options, (err, resp, body) => {
      if (err) {
        req.error(err);
      } else if (body && body.errors && Array.isArray(body.errors)) {
        req.error(body.errors.map(err1 => err1.message).join('\n'));
      } else if (resp.statusCode < 200 && resp.statusCode >= 300) {
        req.error(resp.statusMessage);
      } else {
        req.next({ resp, body });
      }
      req.complete();
    });
  });
}

function getStreamsAuth(state) {
  const token = StateSelector.getStreamsBearerToken(state);
  return token ? { bearer: token } : { username: 'admin', password: 'password' };
}

function getIcp4dAuth(state) {
  const token = StateSelector.getIcp4dBearerToken(state);
  return token ? { bearer: token } : { username: 'admin', password: 'password' };
}

/**
 *  Exports
 */

const build = {
  getAll,
  getStatus,
  create,
  deleteBuild,
  uploadSource,
  updateSource,
  getLogMessages,
  start,
  cancel,
  getSnapshots
};

const artifact = {
  getArtifacts,
  getArtifact,
  getAdl,
  downloadApplicationBundle,
  uploadApplicationBundleToInstance,
  submitJob
};

const toolkit = {
  getToolkits,
  getToolkit,
  addToolkit,
  deleteToolkit,
  getToolkitIndex
};

const icp4d = {
  icp4dHostExists,
  getServiceInstances,
  getIcp4dToken,
  getStreamsAuthToken
};

const StreamsRestUtils = {
  build,
  artifact,
  toolkit,
  icp4d,
  setTimeout
};

export default StreamsRestUtils;
