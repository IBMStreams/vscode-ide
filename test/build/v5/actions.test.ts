import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as actions from '../../../src/build/v5/actions';

describe('actions', function() {
    let expectedOutput;

    it('#setIcp4dUrl()', function() {
        const icp4dUrl = 'test';
        expectedOutput = {
            type: actions.actions.SET_ICP4D_URL,
            icp4dUrl
        };
        expect(actions.setIcp4dUrl(icp4dUrl)).to.deep.equal(expectedOutput);
    });

    it('#setUseIcp4dMasterNodeHost()', function() {
        const useIcp4dMasterNodeHost = true;
        expectedOutput = {
            type: actions.actions.SET_USE_ICP4D_MASTER_NODE_HOST,
            useIcp4dMasterNodeHost
        };
        expect(actions.setUseIcp4dMasterNodeHost(useIcp4dMasterNodeHost)).to.deep.equal(expectedOutput);
    });

    it('#setCurrentLoginStep()', function() {
        const currentLoginStep = 1;
        expectedOutput = {
            type: actions.actions.SET_CURRENT_LOGIN_STEP,
            currentLoginStep
        };
        expect(actions.setCurrentLoginStep(currentLoginStep)).to.deep.equal(expectedOutput);
    });

    it('#setUsername()', function() {
        const username = 'test';
        expectedOutput = {
            type: actions.actions.SET_USERNAME,
            username
        };
        expect(actions.setUsername(username)).to.deep.equal(expectedOutput);
    });

    it('#setPassword()', function() {
        const password = 'test';
        expectedOutput = {
            type: actions.actions.SET_PASSWORD,
            password
        };
        expect(actions.setPassword(password)).to.deep.equal(expectedOutput);
    });

    it('#setRememberPassword()', function() {
        const rememberPassword = true;
        expectedOutput = {
            type: actions.actions.SET_REMEMBER_PASSWORD,
            rememberPassword
        };
        expect(actions.setRememberPassword(rememberPassword)).to.deep.equal(expectedOutput);
    });

    it('#setFormDataField()', function() {
        const key = 'test';
        const value = 'test2';
        expectedOutput = {
            type: actions.actions.SET_FORM_DATA_FIELD,
            key,
            value
        };
        expect(actions.setFormDataField(key, value)).to.deep.equal(expectedOutput);
    });

    it('#setBuildOriginator()', function() {
        const originator = 'test';
        const version = '1.2.3';
        expectedOutput = {
            type: actions.actions.SET_BUILD_ORIGINATOR,
            originator,
            version
        };
        expect(actions.setBuildOriginator(originator, version)).to.deep.equal(expectedOutput);
    });

    it('#queueAction()', function() {
        const queuedAction = { type: 'test' };
        expectedOutput = {
            type: actions.actions.QUEUE_ACTION,
            queuedAction
        };
        expect(actions.queueAction(queuedAction)).to.deep.equal(expectedOutput);
    });

    it('#clearQueuedAction()', function() {
        expectedOutput = { type: actions.actions.CLEAR_QUEUED_ACTION };
        expect(actions.clearQueuedAction()).to.deep.equal(expectedOutput);
    });

    it('#checkIcp4dHostExists()', function() {
        const successFn = function() { };
        const errorFn = function() { };
        expectedOutput = {
            type: actions.actions.CHECK_ICP4D_HOST_EXISTS,
            successFn,
            errorFn
        };
        expect(actions.checkIcp4dHostExists(successFn, errorFn)).to.deep.equal(expectedOutput);
    });

    it('#authenticateIcp4d()', function() {
        const username = 'test';
        const password = 'test2';
        const rememberPassword = false;
        expectedOutput = {
            type: actions.actions.AUTHENTICATE_ICP4D,
            username,
            password,
            rememberPassword
        };
        expect(actions.authenticateIcp4d(username, password, rememberPassword)).to.deep.equal(expectedOutput);
    });

    it('#authenticateStreamsInstance()', function() {
        const instanceName = 'test';
        expectedOutput = {
            type: actions.actions.AUTHENTICATE_STREAMS_INSTANCE,
            instanceName
        };
        expect(actions.authenticateStreamsInstance(instanceName)).to.deep.equal(expectedOutput);
    });

    it('#setStreamsInstances()', function() {
        const streamsInstances = [{ name: 'test' }];
        expectedOutput = {
            type: actions.actions.SET_STREAMS_INSTANCES,
            streamsInstances
        };
        expect(actions.setStreamsInstances(streamsInstances)).to.deep.equal(expectedOutput);
    });

    it('#setSelectedInstance()', function() {
        const streamsInstance = { name: 'test' };
        expectedOutput = {
            type: actions.actions.SET_SELECTED_INSTANCE,
            ...streamsInstance,
            currentLoginStep: 3
        };
        expect(actions.setSelectedInstance(streamsInstance)).to.deep.equal(expectedOutput);
    });

    it('#setIcp4dAuthToken()', function() {
        const authToken = 'test';
        expectedOutput = {
            type: actions.actions.SET_ICP4D_AUTH_TOKEN,
            authToken,
            currentLoginStep: 2
        };
        expect(actions.setIcp4dAuthToken(authToken)).to.deep.equal(expectedOutput);
    });

    it('#setIcp4dAuthError()', function() {
        const authError = 'test';
        expectedOutput = {
            type: actions.actions.SET_ICP4D_AUTH_ERROR,
            authError
        };
        expect(actions.setIcp4dAuthError(authError)).to.deep.equal(expectedOutput);
    });

    it('#setStreamsAuthToken()', function() {
        const authToken = 'test';
        expectedOutput = {
            type: actions.actions.SET_STREAMS_AUTH_TOKEN,
            authToken
        };
        expect(actions.setStreamsAuthToken(authToken)).to.deep.equal(expectedOutput);
    });

    it('#setStreamsAuthError()', function() {
        const authError = 'test';
        expectedOutput = {
            type: actions.actions.SET_STREAMS_AUTH_ERROR,
            authError
        };
        expect(actions.setStreamsAuthError(authError)).to.deep.equal(expectedOutput);
    });

    it('#resetAuth()', function() {
        expectedOutput = { type: actions.actions.RESET_AUTH };
        expect(actions.resetAuth()).to.deep.equal(expectedOutput);
    });

    it('#startBuild()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.START_BUILD,
            buildId
        };
        expect(actions.startBuild(buildId)).to.deep.equal(expectedOutput);
    });

    it('#newBuild()', function() {
        const appRoot = './...';
        const toolkitRootPath = '/toolkits';
        const fqn = 'test';
        const makefilePath = '/makefile';
        const postBuildAction = { type: 'test' };
        expectedOutput = {
            type: actions.actions.NEW_BUILD,
            appRoot,
            toolkitRootPath,
            fqn,
            makefilePath,
            postBuildAction
        };
        expect(actions.newBuild({
            appRoot,
            toolkitRootPath,
            fqn,
            makefilePath,
            postBuildAction
        })).to.deep.equal(expectedOutput);
    });

    it('#uploadSource()', function() {
        const appRoot = './...';
        const toolkitRootPath = '/toolkits';
        const fqn = 'test';
        const makefilePath = '/makefile';
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.BUILD_UPLOAD_SOURCE,
            buildId,
            appRoot,
            toolkitRootPath,
            fqn,
            makefilePath
        };
        expect(actions.uploadSource(buildId, appRoot, toolkitRootPath, fqn, makefilePath)).to.deep.equal(expectedOutput);
    });

    it('#getBuildStatus()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.GET_BUILD_STATUS,
            buildId
        };
        expect(actions.getBuildStatus(buildId)).to.deep.equal(expectedOutput);
    });

    it('#logBuildStatus()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.LOG_BUILD_STATUS,
            buildId
        };
        expect(actions.logBuildStatus(buildId)).to.deep.equal(expectedOutput);
    });

    it('#getBuildStatusFulfilled()', function() {
        const buildStatusResponse = { test: 'test' };
        expectedOutput = {
            type: actions.actions.GET_BUILD_STATUS_FULFILLED,
            ...buildStatusResponse
        };
        expect(actions.getBuildStatusFulfilled(buildStatusResponse)).to.deep.equal(expectedOutput);
    });

    it('#getBuildLogMessagesFulfilled()', function() {
        const buildLogMessagesResponse = { message: 'test' };
        expectedOutput = {
            type: actions.actions.GET_BUILD_LOG_MESSAGES_FULFILLED,
            ...buildLogMessagesResponse
        };
        expect(actions.getBuildLogMessagesFulfilled(buildLogMessagesResponse)).to.deep.equal(expectedOutput);
    });

    it('#buildSucceeded()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.BUILD_SUCCESS,
            buildId
        };
        expect(actions.buildSucceeded(buildId)).to.deep.equal(expectedOutput);
    });

    it('#buildFailed()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.BUILD_FAILED,
            buildId
        };
        expect(actions.buildFailed(buildId)).to.deep.equal(expectedOutput);
    });

    it('#buildInProgress()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.BUILD_IN_PROGRESS,
            buildId
        };
        expect(actions.buildInProgress(buildId)).to.deep.equal(expectedOutput);
    });

    it('#buildStatusReceived()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.BUILD_STATUS_RECEIVED,
            buildId
        };
        expect(actions.buildStatusReceived(buildId)).to.deep.equal(expectedOutput)
    });

    it('#getBuildArtifacts()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.GET_BUILD_ARTIFACTS,
            buildId
        };
        expect(actions.getBuildArtifacts(buildId)).to.deep.equal(expectedOutput);
    });

    it('#getBuildArtifactsFulfilled()', function() {
        const buildId = '001';
        const artifacts = ['test'];
        expectedOutput = {
            type: actions.actions.GET_BUILD_ARTIFACTS_FULFILLED,
            buildId,
            artifacts
        };
        expect(actions.getBuildArtifactsFulfilled(buildId, artifacts)).to.deep.equal(expectedOutput);
    });

    it('#downloadAppBundles()', function() {
        const buildId = '001';
        expectedOutput = {
            type: actions.actions.DOWNLOAD_APP_BUNDLES,
            buildId
        };
        expect(actions.downloadAppBundles(buildId)).to.deep.equal(expectedOutput);
    });

    it('#submitApplications()', function() {
        const buildId = '001';
        const fromArtifact = 'test';
        expectedOutput = {
            type: actions.actions.SUBMIT_APPLICATIONS,
            buildId,
            fromArtifact
        };
        expect(actions.submitApplications(buildId, fromArtifact)).to.deep.equal(expectedOutput);
    });

    it('#submitApplicationsFromBundleFiles()', function() {
        const bundles = ['test', 'test2'];
        expectedOutput = {
            type: actions.actions.SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES,
            bundles
        };
        expect(actions.submitApplicationsFromBundleFiles(bundles)).to.deep.equal(expectedOutput);
    });

    it('#openStreamingAnalyticsConsole()', function() {
        expectedOutput = { type: actions.actions.OPEN_STREAMS_CONSOLE };
        expect(actions.openStreamingAnalyticsConsole()).to.deep.equal(expectedOutput);
    });

    it('#refreshToolkits()', function() {
        expectedOutput = { type: actions.actions.REFRESH_TOOLKITS };
        expect(actions.refreshToolkits()).to.deep.equal(expectedOutput);
    });

    it('#setToolkitsCacheDir()', function() {
        const toolkitsCacheDir = '/toolkitsCache';
        expectedOutput = {
            type: actions.actions.SET_TOOLKITS_CACHE_DIR,
            toolkitsCacheDir
        };
        expect(actions.setToolkitsCacheDir(toolkitsCacheDir)).to.deep.equal(expectedOutput);
    });

    it('#setToolkitsPathSetting()', function() {
        const toolkitsPathSetting = '/toolkits';
        expectedOutput = {
            type: actions.actions.SET_TOOLKITS_PATH_SETTING,
            toolkitsPathSetting
        };
        expect(actions.setToolkitsPathSetting(toolkitsPathSetting)).to.deep.equal(expectedOutput);
    });

    it('#handleError()', function() {
        const sourceAction = { type: 'test' };
        const error = 'testing';
        expectedOutput = {
            type: actions.actions.ERROR,
            sourceAction,
            error
        };
        expect(actions.handleError(sourceAction, error)).to.deep.equal(expectedOutput);
    });

    it('#executeCallbackFn()', function() {
        const callbackFn = function() {};
        expectedOutput = {
            type: actions.actions.EXECUTE_CALLBACK_FN,
            callbackFn
        };
        expect(actions.executeCallbackFn(callbackFn)).to.deep.equal(expectedOutput);
    });
});
