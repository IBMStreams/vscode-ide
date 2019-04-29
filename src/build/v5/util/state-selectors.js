import * as path from 'path';
import { createSelector } from 'reselect';
import { Map } from 'immutable';
import { URL } from 'url';

/**
 * build state selectors
 */

const getBase = (state) => Map(state.streamsV5Build);

const getPackageActivated = createSelector(
  getBase,
  (base = Map()) => base.getIn(['packageActivated'])
);

const getLoginFormInitialized = createSelector(
  getBase,
  (base = Map()) => base.getIn(['formData', 'loginFormInitialized'])
);

const getBuildOriginator = createSelector(
  getBase,
  (base = Map()) => base.getIn(['buildOriginator'])
);

const getQueuedAction = createSelector(
  getBase,
  (base = Map()) => base.getIn(['queuedAction'])
);

const getSelectedInstance = createSelector(
  getBase,
  (base = Map()) => base.getIn(['selectedInstance'])
);

const getBuilds = createSelector(
  getBase,
  (base = Map()) => base.getIn(['builds'])
);

const getSelectedInstanceName = createSelector(
  getBase,
  (base = Map()) => base.getIn(['selectedInstance', 'instanceName'])
);

const getIcp4dBearerToken = createSelector(
  getBase,
  (base = Map()) => base.getIn(['icp4dAuthToken'])
);

const getStreamsBearerToken = createSelector(
  getBase,
  (base = Map()) => base.getIn(['selectedInstance', 'streamsAuthToken'])
);

const getCurrentLoginStep = createSelector(
  getBase,
  (base = Map()) => base.getIn(['currentLoginStep'])
);

const getIcp4dAuthError = createSelector(
  getBase,
  (base = Map()) => base.getIn(['icp4dAuthError'])
);

const getStreamsAuthError = createSelector(
  getBase,
  (base = Map()) => base.getIn(['streamsAuthError'])
);

const getServiceInstanceId = createSelector(
  getBase,
  (base = Map()) => base.getIn(['selectedInstance', 'serviceInstanceId'])
);

const getStreamsInstances = createSelector(
  getBase,
  (base = Map()) => base.getIn(['streamsInstances'])
);

const getUsername = createSelector(
  getBase,
  (base = Map()) => base.getIn(['username'])
);

const hasAuthenticatedIcp4d = (state) => typeof getIcp4dBearerToken(state) === 'string';
const hasAuthenticatedToStreamsInstance = (state) => typeof getStreamsBearerToken(state) === 'string';

const getRememberPassword = createSelector(
  getBase,
  (base = Map()) => base.getIn(['rememberPassword'])
);

const getFormUsername = createSelector(
  getBase,
  (base = Map()) => base.getIn(['formData', 'username'])
);

const getFormPassword = createSelector(
  getBase,
  (base = Map()) => base.getIn(['formData', 'password'])
);

const getFormRememberPassword = createSelector(
  getBase,
  (base = Map()) => base.getIn(['formData', 'rememberPassword'])
);

// temporary build details; before getting a build id
const getNewBuild = createSelector(
  getBase,
  getSelectedInstanceName,
  (base = Map(), selectedInstanceName) => base.getIn(['builds', selectedInstanceName, 'newBuild'])
);

const getBuildsForSelectedInstance = createSelector(
  getBase,
  getSelectedInstanceName,
  (base = Map(), instanceName) => base.getIn(['builds', instanceName])
);

// build
const getBuild = (state, buildId) => {
  const base = getBase(state);
  if (base) {
    const builds = getBuildsForSelectedInstance(state);
    if (builds) {
      return builds[buildId];
    }
  }
  return {};
  // const builds = getBuildsForSelectedInstance(state);
  // return builds[buildId];
};

const getPostBuildAction = (state, buildId) => {
  const build = getBuild(state, buildId);
  if (build) {
    return build.postBuildAction || '';
  }
  return '';
};

const getBuildAppRoot = (state, buildId) => getBuild(state, buildId).appRoot;

const getBuildStatus = (state, buildId) => getBuild(state, buildId).status;

const getBuildLogMessages = (state, buildId) => getBuild(state, buildId).logMessages;

const getBuildArtifacts = (state, buildId) => getBuild(state, buildId).artifacts;

// artifact object for specific artifact id of build
const getBuildArtifact = (state, buildId, artifactId) => getBuildArtifacts(state, buildId).find(artifact => artifact.id === artifactId);

// application root path
const getProjectPath = (state, buildId) => getBuild(state, buildId).appRoot;

// computed fs path to  use for downloading artifact
const getOutputArtifactFilePath = (state, buildId, artifactId) => {
  const artifact = getBuildArtifact(state, buildId, artifactId);
  const projectPath = getProjectPath(state, buildId);
  return `${projectPath}/output/${artifact.name}`;
};

const getBuildDisplayIdentifier = (state, buildId) => {
  const build = getBuild(state, buildId);
  return build.makefilePath ? `${path.basename(build.appRoot)}${path.sep}${path.relative(build.appRoot, build.makefilePath)}` : build.fqn;
};

const getMessageHandlerIdentifier = (state, buildId) => {
  const build = getBuild(state, buildId);
  return build.fqn || build.makefilePath;
};

const getToolkitsCacheDir = createSelector(
  getBase,
  base => base.getIn(['toolkitsCacheDir'])
);

const getToolkitsPathSetting = createSelector(
  getBase,
  base => base.getIn(['toolkitsPathSetting'])
);

/**
 * Base configuration and authentication state selectors
 */

const getUseIcp4dMasterNodeHost = createSelector(
  getBase,
  (base = Map()) => base.getIn(['useIcp4dMasterNodeHost'])
);

const getIcp4dUrl = createSelector(
  getBase,
  (base = Map()) => base.getIn(['icp4dUrl'])
);

const baseGetStreamsBuildRestUrl = createSelector(
  getBase,
  (base = Map()) => base.getIn(['selectedInstance', 'streamsBuildRestUrl'])
);

const baseGetStreamsRestUrl = createSelector(
  getBase,
  (base = Map()) => base.getIn(['selectedInstance', 'streamsRestUrl'])
);

const baseGetStreamsConsoleUrl = createSelector(
  getBase,
  (base = Map()) => base.getIn(['selectedInstance', 'streamsConsoleUrl'])
);

const baseGetStreamsJmxUrl = createSelector(
  getBase,
  (base = Map()) => base.getIn(['selectedInstance', 'streamsConsoleUrl'])
);

const getStreamsBuildRestUrl = createSelector(
  getIcp4dUrl,
  getUseIcp4dMasterNodeHost,
  baseGetStreamsBuildRestUrl,
  (icp4dUrlString, useIcp4dMasterNodeHost, buildRestUrlString) => {
    let buildRestUrlStr = useIcp4dMasterNodeHost ? convertUrl(icp4dUrlString, buildRestUrlString) : buildRestUrlString;
    if (buildRestUrlStr.endsWith('/builds')) {
      buildRestUrlStr = buildRestUrlStr.substring(0, buildRestUrlStr.lastIndexOf('/builds'));
    }
    return buildRestUrlStr;
  }
);

const getStreamsRestUrl = createSelector(
  getIcp4dUrl,
  getUseIcp4dMasterNodeHost,
  baseGetStreamsRestUrl,
  (icp4dUrlString, useIcp4dMasterNodeHost, streamsRestUrlString) => {
    return useIcp4dMasterNodeHost ? convertUrl(icp4dUrlString, streamsRestUrlString) : streamsRestUrlString;
  }
);

const getStreamsConsoleUrl = createSelector(
  getIcp4dUrl,
  getUseIcp4dMasterNodeHost,
  baseGetStreamsConsoleUrl,
  (icp4dUrlString, useIcp4dMasterNodeHost, streamsConsoleUrlString) => {
    return useIcp4dMasterNodeHost ? convertUrl(icp4dUrlString, streamsConsoleUrlString) : streamsConsoleUrlString;
  }
);

const getStreamsJmxUrl = createSelector(
  getIcp4dUrl,
  getUseIcp4dMasterNodeHost,
  baseGetStreamsJmxUrl,
  (icp4dUrlString, useIcp4dMasterNodeHost, streamsJmxUrlString) => {
    return useIcp4dMasterNodeHost ? convertUrl(icp4dUrlString, streamsJmxUrlString) : streamsJmxUrlString;
  }
);

const convertUrl = (icp4dUrlString, endpointUrlString) => {
  try {
    const icp4dUrl = new URL(icp4dUrlString);
    const streamsRestUrl = new URL(endpointUrlString);
    streamsRestUrl.hostname = icp4dUrl.hostname;
    return streamsRestUrl.toString();
  } catch (err) {
    return endpointUrlString;
  }
};

const StateSelector = {
  getPackageActivated,
  getBuildOriginator,
  getLoginFormInitialized,
  getUsername,
  getRememberPassword,
  getCurrentLoginStep,
  getIcp4dAuthError,
  getStreamsAuthError,
  getQueuedAction,

  getFormUsername,
  getFormPassword,
  getFormRememberPassword,

  getUseIcp4dMasterNodeHost,
  getIcp4dUrl,
  getStreamsRestUrl,
  getStreamsBuildRestUrl,
  getStreamsConsoleUrl,
  getStreamsJmxUrl,
  getIcp4dBearerToken,
  hasAuthenticatedIcp4d,
  getStreamsBearerToken,
  hasAuthenticatedToStreamsInstance,
  getSelectedInstanceName,
  getServiceInstanceId,
  getStreamsInstances,

  getNewBuild,
  getBuildStatus,
  getBuildAppRoot,
  getBuildLogMessages,
  getPostBuildAction,
  getBuildDisplayIdentifier,

  getBuildArtifacts,
  getBuildArtifact,
  getOutputArtifactFilePath,

  getToolkitsCacheDir,
  getToolkitsPathSetting,

  getMessageHandlerIdentifier
};

export default StateSelector;
