import { expect } from 'chai';
import { before, describe, it } from 'mocha';
import { applyMiddleware, createStore } from 'redux';
import { ActionsObservable, createEpicMiddleware } from 'redux-observable';
import { Observable, of } from 'rxjs';
import * as operators from 'rxjs/operators';
import * as sinon from 'sinon';
import MessageHandlerRegistry from '../../../src/build/message-handler-registry';
import MessageHandler from '../../../src/build/MessageHandler';
import { actions } from '../../../src/build/v5/actions';
import rootEpic from '../../../src/build/v5/epics';
import rootReducer from '../../../src/build/v5/reducers';
import {
    ResponseSelector,
    SourceArchiveUtils,
    StateSelector,
    StatusUtils,
    StreamsRestUtils,
    StreamsToolkitsUtils
} from '../../../src/build/v5/util';
import { Keychain } from '../../../src/utils';

function getState$(store) {
    return new Observable(((observer) => {
        observer.next(store.getState());
        const unsubscribe = store.subscribe(() => {
            observer.next(store.getState());
        });
        return unsubscribe;
    }));
}

describe('epics', function() {
    let store = {};
    let state;
    let sandbox: sinon.SinonSandbox;
    let error: Error;

    before(function() {
        sandbox = sinon.createSandbox();
        error = new Error();
    });

    after(function() {
        sandbox.restore();
    });

    describe('errorHandlingEpic', function() {
        let action;

        before(function() {
            action = ActionsObservable.of({
                type: actions.ERROR,
                error: 'test error',
                sourceAction: { type: 'testSourceAction' }
            });
            MessageHandlerRegistry.setDefault(null);
        });

        after(function() {
            MessageHandlerRegistry.setDefault(new MessageHandler(null));
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);
        });

        it('Missing a default MessageHandler', function() {
            const expectedOutput = {
                type: actions.ERROR,
                sourceAction: action
            };
            rootEpic(action, state).subscribe((output) => {
                expect(output).to.have.all.keys('type', 'sourceAction', 'error');
                expect(output).to.include(expectedOutput);
                expect(output.error).to.be.an.instanceof(TypeError);
            });
        });

        it('With a default MessageHandler', function() {
            MessageHandlerRegistry.setDefault(new MessageHandler(null));
            const expectedOutput = { type: actions.POST_ERROR };
            rootEpic(action, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('buildAppEpic', function() {
        let getBuildIdStub: sinon.SinonStub;
        let getNewBuildStub: sinon.SinonStub;
        let createStub: sinon.SinonStub;
        let testNewBuildObj;
        let newBuildActionObj;
        let newBuildAction;
        let expectedErrorOutput1;
        let expectedErrorOutput2;

        before(function() {
            testNewBuildObj = {
                appRoot: 'testRoot',
                toolkitRootPath: 'testToolkit',
                fqn: 'testFqn',
                makefilePath: 'testMake'
            };
            newBuildActionObj = {
                type: actions.NEW_BUILD,
                ...testNewBuildObj,
                postBuildAction: { type: 'TEST' }
            };
            newBuildAction = ActionsObservable.of(newBuildActionObj);
            expectedErrorOutput1 = { type: actions.ERROR, sourceAction: newBuildAction, error };
            expectedErrorOutput2 = { type: actions.ERROR, sourceAction: newBuildActionObj };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getBuildIdStub = sandbox.stub(ResponseSelector, 'getBuildId');
            getNewBuildStub = sandbox.stub(StateSelector, 'getNewBuild');
            createStub = sandbox.stub(StreamsRestUtils.build, 'create');

            getBuildIdStub.returns('001');
            getNewBuildStub.returns(testNewBuildObj);
            createStub.returns(newBuildAction);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.BUILD_UPLOAD_SOURCE, buildId: '001', ...testNewBuildObj };
            rootEpic(newBuildAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if ResponseSelector.getBuildId fails', function() {
            getBuildIdStub.returns(null);
            rootEpic(newBuildAction, state).subscribe((output) => {
                expect(output).to.have.all.keys('type', 'sourceAction', 'error');
                expect(output).to.deep.include(expectedErrorOutput2);
                expect(output.error).to.be.an.instanceof(Error);
            });
        });

        it('should handle failure if StateSelector.getNewBuild fails', function() {
            getNewBuildStub.callsFake(() => { throw error; });
            expectedErrorOutput2.error = error;
            rootEpic(newBuildAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StreamsRestUtils.build.create fails', function() {
            createStub.callsFake(() => { throw error; });
            rootEpic(newBuildAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput1);
            });
        });
    });

    describe('uploadSourceEpic', function() {
        let buildSourceArchiveStub: sinon.SinonStub;
        let sourceArchiveCreatedActionObj;
        let buildUploadSourceAction;

        before(function() {
            sourceArchiveCreatedActionObj = {
                type: actions.SOURCE_ARCHIVE_CREATED,
                archivePath: 'testPath',
                buildId: '001'
            };
            buildUploadSourceAction = ActionsObservable.of({
                type: actions.BUILD_UPLOAD_SOURCE,
                buildId: '001',
                appRoot: 'testRoot',
                toolkitRootPath: 'testToolkit',
                fqn: 'testFqn',
                makefilePath: 'testMake'
            });
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            buildSourceArchiveStub = sandbox.stub(SourceArchiveUtils, 'buildSourceArchive');
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            buildSourceArchiveStub.returns(ActionsObservable.of(sourceArchiveCreatedActionObj));
            const expectedOutput = sourceArchiveCreatedActionObj;
            rootEpic(buildUploadSourceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if SourceArchiveUtils.buildSourceArchive fails', function() {
            buildSourceArchiveStub.callsFake(() => { throw error; });
            const expectedOutput = { type: actions.ERROR, sourceAction: buildUploadSourceAction, error };
            rootEpic(buildUploadSourceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('sourceArchiveCreatedEpic', function() {
        let uploadSourceStub: sinon.SinonStub;
        let sourceArchiveCreatedAction;

        before(function() {
            sourceArchiveCreatedAction = ActionsObservable.of({
                type: actions.SOURCE_ARCHIVE_CREATED,
                buildId: '001',
                archivePath: 'testPath'
            });
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            uploadSourceStub = sandbox.stub(StreamsRestUtils.build, 'uploadSource');
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            uploadSourceStub.returns(sourceArchiveCreatedAction);
            const expectedOutput = { type: actions.START_BUILD, buildId: '001' };
            rootEpic(sourceArchiveCreatedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.build.uploadSource fails', function() {
            uploadSourceStub.callsFake(() => { throw error; });
            const expectedOutput = { type: actions.ERROR, sourceAction: sourceArchiveCreatedAction, error };
            rootEpic(sourceArchiveCreatedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('startBuildEpic', function() {
        let startStub: sinon.SinonStub;
        let delayStub: sinon.SinonStub;
        let startBuildAction;

        before(function() {
            startBuildAction = ActionsObservable.of({
                type: actions.START_BUILD,
                buildId: '001'
            });
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            startStub = sandbox.stub(StreamsRestUtils.build, 'start');
            delayStub = sandbox.stub(operators, 'delay');

            startStub.returns(startBuildAction);
            delayStub.returns((val) => val);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.GET_BUILD_STATUS, buildId: '001' };
            rootEpic(startBuildAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.build.start fails', function() {
            startStub.callsFake(() => { throw error; });
            const expectedOutput = { type: actions.ERROR, sourceAction: startBuildAction, error };
            rootEpic(startBuildAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('buildStatusEpic', function() {
        let getBuildStatusStub: sinon.SinonStub;
        let getStatusStub: sinon.SinonStub;
        let getLogMessagesStub: sinon.SinonStub;
        let buildStatusReturnValue;
        let getBuildStatusAction;
        let logMessagesAction;

        before(function() {
            buildStatusReturnValue = { status: 'test', buildId: '001' };
            getBuildStatusAction = ActionsObservable.of({
                type: actions.GET_BUILD_STATUS,
                buildId: '001'
            });
            logMessagesAction = ActionsObservable.of({ type: null, body: 'test' });
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getBuildStatusStub = sandbox.stub(ResponseSelector, 'getBuildStatus');
            getStatusStub = sandbox.stub(StreamsRestUtils.build, 'getStatus');
            getLogMessagesStub = sandbox.stub(StreamsRestUtils.build, 'getLogMessages');

            getBuildStatusStub.returns(buildStatusReturnValue);
            getStatusStub.returns(getBuildStatusAction);
            getLogMessagesStub.returns(logMessagesAction);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', async function() {
            const expectedOutput = [
                {
                    type: actions.GET_BUILD_STATUS_FULFILLED,
                    status: 'test',
                    buildId: '001'
                },
                {
                    type: actions.GET_BUILD_LOG_MESSAGES_FULFILLED,
                    buildId: '001',
                    logMessages: ['test']
                },
                {
                    type: actions.BUILD_STATUS_RECEIVED,
                    buildId: '001'
                }
            ];
            let i = 0;
            rootEpic(getBuildStatusAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput[i]);
                i += 1;
            });
        });

        it('should handle failure if ResponseSelector.getBuildStatus fails', function() {
            getBuildStatusStub.callsFake(() => { throw error });
            const expectedOutput = [
                {
                    type: actions.ERROR,
                    sourceAction: {
                        type: actions.GET_BUILD_STATUS,
                        buildId: '001'
                    },
                    error
                },
                {
                    type: actions.GET_BUILD_LOG_MESSAGES_FULFILLED,
                    buildId: '001',
                    logMessages: ['test']
                },
                {
                    type: actions.BUILD_STATUS_RECEIVED,
                    buildId: undefined
                }
            ];
            let i = 0;
            rootEpic(getBuildStatusAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput[i]);
                i += 1;
            });
        });

        it('should handle failure if StreamsRestUtils.build.getStatus fails', function() {
            getStatusStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: getBuildStatusAction, error };
            rootEpic(getBuildStatusAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.build.getLogMessages fails', function() {
            getLogMessagesStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: getBuildStatusAction, error };
            rootEpic(getBuildStatusAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if response does not have a body', function() {
            getLogMessagesStub.returns(ActionsObservable.of({ type: null, test: 'test' }));
            const expectedOutput = [
                {
                    type: actions.GET_BUILD_STATUS_FULFILLED,
                    status: 'test',
                    buildId: '001'
                },
                {
                    type: actions.ERROR,
                    sourceAction: {
                        type: actions.GET_BUILD_STATUS,
                        buildId: '001',
                    }
                },
                {
                    type: actions.BUILD_STATUS_RECEIVED,
                    buildId: '001'
                }
            ];
            let i = 0;
            rootEpic(getBuildStatusAction, state).subscribe((output) => {
                if (expectedOutput[i].type === actions.ERROR) {
                    expect(output).to.have.all.keys('type', 'sourceAction', 'error');
                    expect(output).to.deep.include(expectedOutput[i]);
                    expect(output.error).to.be.an.instanceof(TypeError);
                } else {
                    expect(output).to.deep.equal(expectedOutput[i]);
                }
                i += 1;
            });
        });
    });

    describe('buildStatusLoopEpic', function() {
        let delayStub: sinon.SinonStub;
        let buildStatusUpdateStub: sinon.SinonStub;
        let getBuildStatusStub: sinon.SinonStub;
        let buildStatusReceivedAction;

        before(function() {
            buildStatusReceivedAction = ActionsObservable.of({
                type: actions.BUILD_STATUS_RECEIVED,
                buildId: '001'
            });
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            delayStub = sandbox.stub(operators, 'delay');
            buildStatusUpdateStub = sandbox.stub(StatusUtils, 'buildStatusUpdate');
            getBuildStatusStub = sandbox.stub(StateSelector, 'getBuildStatus');

            buildStatusUpdateStub.returns(1);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success when status is built', function() {
            delayStub.callsFake((val) => buildStatusReceivedAction);
            getBuildStatusStub.returns('built');
            const expectedOutput = { type: actions.GET_BUILD_ARTIFACTS, buildId: '001' };
            rootEpic(buildStatusReceivedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle success when status is building or created or waiting', function() {
            delayStub.callsFake(() => operators.map(() => of(1)));
            getBuildStatusStub.returns('building');
            const expectedOutput = { type: actions.GET_BUILD_STATUS, buildId: '001' };
            rootEpic(buildStatusReceivedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StatusUtils.buildStatusUpdate fails', function() {
            delayStub.callsFake(() => operators.map(() => of(1)));
            buildStatusUpdateStub.callsFake(() => { throw error });
            getBuildStatusStub.returns('building');
            const expectedOutput = { type: actions.ERROR, sourceAction: buildStatusReceivedAction, error };
            rootEpic(buildStatusReceivedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StateSelector.getBuildStatus fails', function() {
            const action = ActionsObservable.of({ type: actions.BUILD_STATUS_RECEIVED });
            delayStub.callsFake(() => operators.map(() => of(1)));
            getBuildStatusStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: action, error };
            rootEpic(action, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('getBuildArtifactsEpic', function() {
        let getArtifactsStub: sinon.SinonStub;
        let getBuildArtifactsStub: sinon.SinonStub;
        let getBuildArtifactsActionObj;
        let getBuildArtifactsAction;

        before(function() {
            getBuildArtifactsActionObj = {
                type: actions.GET_BUILD_ARTIFACTS,
                buildId: '001'
            };
            getBuildArtifactsAction = ActionsObservable.of(getBuildArtifactsActionObj);
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getArtifactsStub = sandbox.stub(StreamsRestUtils.artifact, 'getArtifacts');
            getBuildArtifactsStub = sandbox.stub(ResponseSelector, 'getBuildArtifacts');

            getArtifactsStub.returns(getBuildArtifactsAction);
            getBuildArtifactsStub.returns(['test', 'test']);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = {
                type: actions.GET_BUILD_ARTIFACTS_FULFILLED,
                buildId: '001',
                artifacts: ['test', 'test']
            };
            rootEpic(getBuildArtifactsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.artifact.getArtifacts fails', function() {
            getArtifactsStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: getBuildArtifactsAction, error };
            rootEpic(getBuildArtifactsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if ResponseSelector.getBuildArtifacts fails', function() {
            getBuildArtifactsStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: getBuildArtifactsActionObj, error };
            rootEpic(getBuildArtifactsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('getBuildArtifactsFulfilledEpic', function() {
        let downloadOrSubmitStub: sinon.SinonStub;
        let getBuildArtifactsFulfilledAction;

        before(function() {
            getBuildArtifactsFulfilledAction = ActionsObservable.of({
                type: actions.GET_BUILD_ARTIFACTS_FULFILLED,
                buildId: '001',
                artifacts: [{ id: 'test' }]
            });
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            downloadOrSubmitStub = sandbox.stub(StatusUtils, 'downloadOrSubmit');

            downloadOrSubmitStub.returns(1);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.POST_GET_BUILD_ARTIFACTS_FULFILLED };
            rootEpic(getBuildArtifactsFulfilledAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StatusUtils.downloadOrSubmit fails', function() {
            downloadOrSubmitStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: getBuildArtifactsFulfilledAction, error };
            rootEpic(getBuildArtifactsFulfilledAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('downloadArtifactsEpic', function() {
        let downloadAppBundlesStub: sinon.SinonStub;
        let getBuildArtifactsStub: sinon.SinonStub;
        let getOutputArtifactFilePathStub: sinon.SinonStub;
        let appBundleDownloadedStub: sinon.SinonStub;
        let downloadAppBundlesActionObj;
        let downloadAppBundlesAction;
        let expectedErrorOutput1;
        let expectedErrorOutput2;

        before(function() {
            downloadAppBundlesActionObj = {
                type: actions.DOWNLOAD_APP_BUNDLES,
                buildId: '001'
            };
            downloadAppBundlesAction = ActionsObservable.of(downloadAppBundlesActionObj);
            expectedErrorOutput1 = { type: actions.ERROR, sourceAction: downloadAppBundlesAction, error };
            expectedErrorOutput2 = { type: actions.ERROR, sourceAction: downloadAppBundlesActionObj, error };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            downloadAppBundlesStub = sandbox.stub(StreamsRestUtils.artifact, 'downloadApplicationBundle');
            getBuildArtifactsStub = sandbox.stub(StateSelector, 'getBuildArtifacts');
            getOutputArtifactFilePathStub = sandbox.stub(StateSelector, 'getOutputArtifactFilePath');
            appBundleDownloadedStub = sandbox.stub(StatusUtils, 'appBundleDownloaded');

            downloadAppBundlesStub.returns(ActionsObservable.of({ type: null, body: 'testing' }));
            getBuildArtifactsStub.returns([{ id: 'test' }]);
            getOutputArtifactFilePathStub.returns(`${__dirname}/output/artifact`);
            appBundleDownloadedStub.returns(1);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.POST_DOWNLOAD_ARTIFACTS };
            rootEpic(downloadAppBundlesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.artifact.downloadApplicationBundle fails', function() {
            downloadAppBundlesStub.callsFake(() => { throw error });
            rootEpic(downloadAppBundlesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StateSelector.getBuildArtifacts fails', function() {
            getBuildArtifactsStub.callsFake(() => { throw error });
            rootEpic(downloadAppBundlesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput1);
            });
        });

        it('should handle failure if StateSelector.getOutputArtifactFilePath fails', function() {
            getOutputArtifactFilePathStub.callsFake(() => { throw error });
            rootEpic(downloadAppBundlesAction, state).subscribe((output) => {
                expect(output).to.deep.equals(expectedErrorOutput2);
            });
        });

        it('should handle failure if StatusUtils.appBundleDownloaded fails', function() {
            appBundleDownloadedStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.POST_DOWNLOAD_ARTIFACTS };
            rootEpic(downloadAppBundlesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('submitApplicationEpic', function() {
        let getBuildArtifactsStub: sinon.SinonStub;
        let submitJobStartStub: sinon.SinonStub;
        let submitJobStub: sinon.SinonStub;
        let getSubmitInfoStub: sinon.SinonStub;
        let jobSubmittedStub: sinon.SinonStub;
        let submitApplicationsActionObj;
        let submitApplicationsAction;
        let expectedErrorOutput1;
        let expectedErrorOutput2;

        before(function() {
            submitApplicationsActionObj = {
                type: actions.SUBMIT_APPLICATIONS,
                buildId: '001',
                fromArtifact: { test: 'test' }
            };
            submitApplicationsAction = ActionsObservable.of(submitApplicationsActionObj);
            expectedErrorOutput1 = { type: actions.ERROR, sourceAction: submitApplicationsAction, error };
            expectedErrorOutput2 = { type: actions.ERROR, sourceAction: submitApplicationsActionObj, error };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getBuildArtifactsStub = sandbox.stub(StateSelector, 'getBuildArtifacts');
            submitJobStartStub = sandbox.stub(StatusUtils, 'submitJobStart');
            submitJobStub = sandbox.stub(StreamsRestUtils.artifact, 'submitJob');
            getSubmitInfoStub = sandbox.stub(ResponseSelector, 'getSubmitInfo');
            jobSubmittedStub = sandbox.stub(StatusUtils, 'jobSubmitted');

            getBuildArtifactsStub.returns([{ id: 'test' }]);
            submitJobStartStub.returns(1);
            submitJobStub.returns(submitApplicationsAction);
            getSubmitInfoStub.returns('test');
            jobSubmittedStub.returns(1);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.POST_SUBMIT_APPLICATIONS };
            rootEpic(submitApplicationsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StateSelector.getBuildArtifacts fails', function() {
            getBuildArtifactsStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput1);
            });
        });

        it('should handle failure if StatusUtils.submitJobStart fails', function() {
            submitJobStartStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StreamsRestUtils.artifact.submitJob fails', function() {
            submitJobStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if ResponseSelector.getSubmitInfo fails', function() {
            getSubmitInfoStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StatusUtils.jobSubmitted fails', function() {
            jobSubmittedStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });
    });

    describe('submitApplicationFromBundleFilesEpic', function() {
        let submitJobStartStub: sinon.SinonStub;
        let uploadApplicationBundleToInstanceStub: sinon.SinonStub;
        let getUploadedBundleIdStub: sinon.SinonStub;
        let submitJobStub: sinon.SinonStub;
        let getSubmitInfoStub: sinon.SinonStub;
        let jobSubmittedStub: sinon.SinonStub;
        let submitApplicationsFromBundleFilesActionObj;
        let submitApplicationsFromBundleFilesAction;
        let expectedErrorOutput;

        before(function() {
            submitApplicationsFromBundleFilesActionObj = {
                type: actions.SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES,
                bundles: [{ bundlePath: 'testing' }]
            };
            submitApplicationsFromBundleFilesAction = ActionsObservable.of(submitApplicationsFromBundleFilesActionObj);
            expectedErrorOutput = { type: actions.ERROR, sourceAction: submitApplicationsFromBundleFilesActionObj, error };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            submitJobStartStub = sandbox.stub(StatusUtils, 'submitJobStart');
            uploadApplicationBundleToInstanceStub = sandbox.stub(StreamsRestUtils.artifact, 'uploadApplicationBundleToInstance');
            getUploadedBundleIdStub = sandbox.stub(ResponseSelector, 'getUploadedBundleId');
            submitJobStub = sandbox.stub(StreamsRestUtils.artifact, 'submitJob');
            getSubmitInfoStub = sandbox.stub(ResponseSelector, 'getSubmitInfo');
            jobSubmittedStub = sandbox.stub(StatusUtils, 'jobSubmitted');

            submitJobStartStub.returns(1);
            uploadApplicationBundleToInstanceStub.returns(submitApplicationsFromBundleFilesAction);
            getUploadedBundleIdStub.returns('test');
            submitJobStub.returns(submitApplicationsFromBundleFilesAction);
            getSubmitInfoStub.returns('test');
            jobSubmittedStub.returns(1);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.POST_SUBMIT_APPLICATIONS_FROM_BUNDLE_FILES, };
            rootEpic(submitApplicationsFromBundleFilesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StatusUtils.submitJobStart fails', function() {
            submitJobStartStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsFromBundleFilesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.artifact.uploadApplicationBundleToInstance fails', function() {
            uploadApplicationBundleToInstanceStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsFromBundleFilesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });

        it('should handle failure if ResponseSelector.getUploadedBundleId fails', function() {
            getUploadedBundleIdStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsFromBundleFilesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.artifact.submitJob fails', function() {
            submitJobStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsFromBundleFilesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });

        it('should handle failure if ResponseSelector.getSubmitInfo fails', function() {
            getSubmitInfoStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsFromBundleFilesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });

        it('should handle failure if StatusUtils.jobSubmitted fails', function() {
            jobSubmittedStub.callsFake(() => { throw error });
            rootEpic(submitApplicationsFromBundleFilesAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });
    });

    describe('openStreamsConsoleEpic', function() {
        let getStreamsConsoleUrlStub: sinon.SinonStub;
        let openUrlStub: sinon.SinonStub;
        let openStreamsConsoleAction;
        let expectedErrorOutput;

        before(function() {
            openStreamsConsoleAction = ActionsObservable.of({
                type: actions.OPEN_STREAMS_CONSOLE
            });
            expectedErrorOutput = { type: actions.ERROR, sourceAction: openStreamsConsoleAction, error };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getStreamsConsoleUrlStub = sandbox.stub(StateSelector, 'getStreamsConsoleUrl');
            openUrlStub = sandbox.stub(MessageHandlerRegistry, 'openUrl');

            getStreamsConsoleUrlStub.returns(1);
            openUrlStub.returns(1);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.POST_OPEN_STREAMS_CONSOLE };
            rootEpic(openStreamsConsoleAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StateSelector.getStreamsConsoleUrl fails', function() {
            getStreamsConsoleUrlStub.callsFake(() => { throw error });
            rootEpic(openStreamsConsoleAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });

        it('should handle failure if MessageHandlerRegistry.openUrl fails', function() {
            openUrlStub.callsFake(() => { throw error });
            rootEpic(openStreamsConsoleAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });
    });

    describe('icp4dHostExistsEpic', function() {
        let icp4dHostExistsStub: sinon.SinonStub;
        let checkIcp4dHostExistsAction;

        before(function() {
            checkIcp4dHostExistsAction = ActionsObservable.of({
                type: actions.CHECK_ICP4D_HOST_EXISTS,
                successFn: () => 1,
                errorFn: () => 1
            });
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            icp4dHostExistsStub = sandbox.stub(StreamsRestUtils.icp4d, 'icp4dHostExists');

            icp4dHostExistsStub.returns(checkIcp4dHostExistsAction);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.POST_CHECK_ICP4D_HOST_EXISTS };
            rootEpic(checkIcp4dHostExistsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.icp4d.icp4dHostExists fails', function() {
            icp4dHostExistsStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: checkIcp4dHostExistsAction, error };
            rootEpic(checkIcp4dHostExistsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('icp4dAuthEpic', function() {
        let getIcp4dTokenStub: sinon.SinonStub;
        let delayStub: sinon.SinonStub;
        let getStatusCodeStub: sinon.SinonStub;
        let addCredentialsStub: sinon.SinonStub;
        let deleteCredentialsStub: sinon.SinonStub;
        let getIcp4dAuthTokenStub: sinon.SinonStub;
        let authenticateIcp4dActionObj;
        let authenticateIcp4dAction;
        let expectedErrorOutput1;
        let expectedErrorOutput2;

        before(function() {
            authenticateIcp4dActionObj = {
                type: actions.AUTHENTICATE_ICP4D,
                username: 'test',
                password: 'test',
                rememberPassword: true
            };
            authenticateIcp4dAction = ActionsObservable.of(authenticateIcp4dActionObj);
            expectedErrorOutput1 = { type: actions.ERROR, sourceAction: authenticateIcp4dAction, error };
            expectedErrorOutput2 = { type: actions.ERROR, sourceAction: authenticateIcp4dActionObj, error };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getIcp4dTokenStub = sandbox.stub(StreamsRestUtils.icp4d, 'getIcp4dToken');
            delayStub = sandbox.stub(operators, 'delay');
            getStatusCodeStub = sandbox.stub(ResponseSelector, 'getStatusCode');
            addCredentialsStub = sandbox.stub(Keychain, 'addCredentials');
            deleteCredentialsStub = sandbox.stub(Keychain, 'deleteCredentials');
            getIcp4dAuthTokenStub = sandbox.stub(ResponseSelector, 'getIcp4dAuthToken');

            getIcp4dTokenStub.returns(authenticateIcp4dAction);
            delayStub.callsFake(() => operators.map(() => of(1)));
            getStatusCodeStub.returns(200);
            addCredentialsStub.returns(1);
            deleteCredentialsStub.returns(1);
            getIcp4dAuthTokenStub.returns({ test: 'test' });
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = [
                {
                    type: actions.SET_ICP4D_AUTH_TOKEN,
                    authToken: { test: 'test' },
                    currentLoginStep: 2
                },
                {
                    type: actions.SET_ICP4D_AUTH_ERROR,
                    authError: false
                },
                authenticateIcp4dActionObj
            ];
            let i = 0;
            rootEpic(authenticateIcp4dAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput[i]);
                i += 1;
            });
        });

        it('should handle failure if status code is not 200', function() {
            getStatusCodeStub.returns(1);
            const expectedOutput = { type: actions.SET_ICP4D_AUTH_ERROR, authError: 1 };
            rootEpic(authenticateIcp4dAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.icp4d.getIcp4dToken fails', function() {
            getIcp4dTokenStub.callsFake(() => { throw error });
            rootEpic(authenticateIcp4dAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput1);
            });
        });

        it('should handle failure if ResponseSelector.getStatusCode fails', function() {
            getStatusCodeStub.callsFake(() => { throw error });
            rootEpic(authenticateIcp4dAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if Keychain.addCredentials fails', function() {
            addCredentialsStub.callsFake(() => { throw error });

            rootEpic(authenticateIcp4dAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if Keychain.deleteCredentials fails', function() {
            deleteCredentialsStub.callsFake(() => { throw error });
            const actionObj = authenticateIcp4dActionObj;
            actionObj.rememberPassword = false;
            const action = ActionsObservable.of(actionObj);
            const expectedOutput = { type: actions.ERROR, sourceAction: actionObj, error };
            rootEpic(action, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if ResponseSelector.getIcp4dAuthToken fails', function() {
            getIcp4dAuthTokenStub.callsFake(() => { throw error });
            rootEpic(authenticateIcp4dAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });
    });

    describe('streamsAuthEpic', function() {
        let getStreamsAuthTokenStub: sinon.SinonStub;
        let delayStub: sinon.SinonStub;
        let getStatusCodeStub: sinon.SinonStub;
        let getQueuedActionStub: sinon.SinonStub;
        let getStreamsAuthTokenResponseStub: sinon.SinonStub;
        let authenticateStreamsInstanceActionObj;
        let authenticateStreamsInstanceAction;
        let expectedErrorOutput1;
        let expectedErrorOutput2;

        before(function() {
            authenticateStreamsInstanceActionObj = {
                type: actions.AUTHENTICATE_STREAMS_INSTANCE,
                instanceName: 'testInstance'
            };
            authenticateStreamsInstanceAction = ActionsObservable.of(authenticateStreamsInstanceActionObj);
            expectedErrorOutput1 = { type: actions.ERROR, sourceAction: authenticateStreamsInstanceAction, error };
            expectedErrorOutput2 = { type: actions.ERROR, sourceAction: authenticateStreamsInstanceActionObj, error };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getStreamsAuthTokenStub = sandbox.stub(StreamsRestUtils.icp4d, 'getStreamsAuthToken');
            delayStub = sandbox.stub(operators, 'delay');
            getStatusCodeStub = sandbox.stub(ResponseSelector, 'getStatusCode');
            getQueuedActionStub = sandbox.stub(StateSelector, 'getQueuedAction');
            getStreamsAuthTokenResponseStub = sandbox.stub(ResponseSelector, 'getStreamsAuthToken');

            getStreamsAuthTokenStub.returns(authenticateStreamsInstanceAction);
            delayStub.callsFake(() => operators.map(() => of(1)));
            getStatusCodeStub.returns(200);
            getQueuedActionStub.returns(authenticateStreamsInstanceAction);
            getStreamsAuthTokenResponseStub.returns({ test: 'test' });
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = [
                { type: actions.SET_STREAMS_AUTH_TOKEN, authToken: { test: 'test' } },
                { type: actions.SET_STREAMS_AUTH_ERROR, authError: false },
                { type: actions.REFRESH_TOOLKITS },
                authenticateStreamsInstanceAction,
                { type: actions.CLEAR_QUEUED_ACTION },
                { type: actions.AUTHENTICATE_STREAMS_INSTANCE, instanceName: 'testInstance' }
            ];
            let i = 0;
            rootEpic(authenticateStreamsInstanceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput[i]);
                i += 1;
            });
        });

        it('should handle failure if status code is not 200', function() {
            getStatusCodeStub.returns(1);
            const expectedOutput = { type: actions.SET_STREAMS_AUTH_ERROR, authError: true };
            rootEpic(authenticateStreamsInstanceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.icp4d.getStreamsAuthToken fails', function() {
            getStreamsAuthTokenStub.callsFake(() => { throw error });
            rootEpic(authenticateStreamsInstanceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput1);
            });
        });

        it('should handle failure if ResponseSelector.getStatusCode fails', function() {
            getStatusCodeStub.callsFake(() => { throw error });
            rootEpic(authenticateStreamsInstanceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StateSelector.getQueuedAction fails', function() {
            getQueuedActionStub.callsFake(() => { throw error });
            rootEpic(authenticateStreamsInstanceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if ResponseSelector.getStreamsAuthToken fails', function() {
            getStreamsAuthTokenResponseStub.callsFake(() => { throw error });
            rootEpic(authenticateStreamsInstanceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });
    });

    describe('getStreamsInstanceEpic', function() {
        let getServiceInstancesStub: sinon.SinonStub;
        let getStreamsInstancesStub: sinon.SinonStub;
        let setIcp4dAuthTokenActionObj;
        let setIcp4dAuthTokenAction;

        before(function() {
            setIcp4dAuthTokenActionObj = {
                type: actions.SET_ICP4D_AUTH_TOKEN,
                authToken: { test: 'test' },
                currentLoginStep: 2
            };
            setIcp4dAuthTokenAction = ActionsObservable.of(setIcp4dAuthTokenActionObj);
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getServiceInstancesStub = sandbox.stub(StreamsRestUtils.icp4d, 'getServiceInstances');
            getStreamsInstancesStub = sandbox.stub(ResponseSelector, 'getStreamsInstances');

            getServiceInstancesStub.returns(setIcp4dAuthTokenAction);
            getStreamsInstancesStub.returns({ testInstance: 'testInstance' });
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.SET_STREAMS_INSTANCES, streamsInstances: { testInstance: 'testInstance' } };
            rootEpic(setIcp4dAuthTokenAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.icp4d.getServiceInstances fails', function() {
            getServiceInstancesStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: setIcp4dAuthTokenAction, error };
            rootEpic(setIcp4dAuthTokenAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if ResponseSelector.getStreamsInstances fails', function() {
            getStreamsInstancesStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: setIcp4dAuthTokenActionObj, error };
            rootEpic(setIcp4dAuthTokenAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('instanceSelectedEpic', function() {
        let getSelectedInstanceNameStub: sinon.SinonStub;
        let setSelectedInstanceAction;

        before(function() {
            setSelectedInstanceAction = ActionsObservable.of({
                type: actions.SET_SELECTED_INSTANCE,
                buildId: '001',
                currentLoginStep: 3
            });
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getSelectedInstanceNameStub = sandbox.stub(StateSelector, 'getSelectedInstanceName');

            getSelectedInstanceNameStub.returns('testInstance');
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.AUTHENTICATE_STREAMS_INSTANCE, instanceName: 'testInstance' };
            rootEpic(setSelectedInstanceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StateSelector.getSelectedInstanceName fails', function() {
            getSelectedInstanceNameStub.callsFake(() => { throw error });
            const expectedOutput = { type: actions.ERROR, sourceAction: setSelectedInstanceAction, error };
            rootEpic(setSelectedInstanceAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });
    });

    describe('refreshToolkitsEpic', function() {
        let getToolkitsStub: sinon.SinonStub;
        let getToolkitsResponseStub: sinon.SinonStub;
        let getToolkitsToCacheStub: sinon.SinonStub;
        let getToolkitIndexStub: sinon.SinonStub;
        let cacheToolkitIndexStub: sinon.SinonStub;
        let refreshLspToolkitsStub: sinon.SinonStub;
        let refreshToolkitsAction;
        let expectedErrorOutput1;
        let expectedErrorOutput2;

        before(function() {
            refreshToolkitsAction = ActionsObservable.of({ type: actions.REFRESH_TOOLKITS });
            expectedErrorOutput1 = { type: actions.ERROR, sourceAction: refreshToolkitsAction, error };
            expectedErrorOutput2 = {
                type: actions.ERROR,
                sourceAction: { type: actions.REFRESH_TOOLKITS },
                error
            };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getToolkitsStub = sandbox.stub(StreamsRestUtils.toolkit, 'getToolkits');
            getToolkitsResponseStub = sandbox.stub(ResponseSelector, 'getToolkits');
            getToolkitsToCacheStub = sandbox.stub(StreamsToolkitsUtils, 'getToolkitsToCache');
            getToolkitIndexStub = sandbox.stub(StreamsRestUtils.toolkit, 'getToolkitIndex');
            cacheToolkitIndexStub = sandbox.stub(StreamsToolkitsUtils, 'cacheToolkitIndex');
            refreshLspToolkitsStub = sandbox.stub(StreamsToolkitsUtils, 'refreshLspToolkits');

            getToolkitsStub.returns(refreshToolkitsAction);
            getToolkitsResponseStub.returns(refreshToolkitsAction);
            getToolkitsToCacheStub.returns([1, 2]);
            getToolkitIndexStub.returns(refreshToolkitsAction);
            cacheToolkitIndexStub.returns(refreshToolkitsAction);
            refreshLspToolkitsStub.returns(refreshToolkitsAction);
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success', function() {
            const expectedOutput = { type: actions.POST_REFRESH_TOOLKITS };
            rootEpic(refreshToolkitsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StreamsRestUtils.toolkit.getToolkits fails', function() {
            getToolkitsStub.callsFake(() => { throw error });
            rootEpic(refreshToolkitsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput1);
            });
        });

        it('should handle failure if ResponseSelector.getToolkits fails', function() {
            getToolkitsResponseStub.callsFake(() => { throw error });
            rootEpic(refreshToolkitsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StreamsToolkitsUtils.getToolkitsToCache fails', function() {
            getToolkitsToCacheStub.callsFake(() => { throw error });
            rootEpic(refreshToolkitsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StreamsRestUtils.tookit.getToolkitIndex fails', function() {
            getToolkitIndexStub.callsFake(() => { throw error });
            rootEpic(refreshToolkitsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StreamsToolkitsUtils.cacheToolkitIndex fails', function() {
            cacheToolkitIndexStub.callsFake(() => { throw error });
            rootEpic(refreshToolkitsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });

        it('should handle failure if StreamsToolkitsUtils.refreshLspToolkits fails', function() {
            refreshLspToolkitsStub.callsFake(() => { throw error });
            rootEpic(refreshToolkitsAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput2);
            });
        });
    });

    describe('packageActivatedEpic', function() {
        let getUsernameStub: sinon.SinonStub;
        let getRememberPasswordStub: sinon.SinonStub;
        let getCredentialsStub: sinon.SinonStub;
        let packageActivatedAction;
        let expectedErrorOutput;

        before(function() {
            packageActivatedAction = ActionsObservable.of({ type: actions.PACKAGE_ACTIVATED });
            expectedErrorOutput = { type: actions.ERROR, sourceAction: packageActivatedAction, error };
        });

        beforeEach(function() {
            const epicMiddleware = createEpicMiddleware();
            store = createStore(rootReducer, applyMiddleware(epicMiddleware));
            epicMiddleware.run(rootEpic);
            state = getState$(store);

            getUsernameStub = sandbox.stub(StateSelector, 'getUsername');
            getRememberPasswordStub = sandbox.stub(StateSelector, 'getRememberPassword');
            getCredentialsStub = sandbox.stub(Keychain, 'getCredentials');

            getUsernameStub.returns('testUser');
            getRememberPasswordStub.returns(true);
            getCredentialsStub.returns('testPassword');
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should handle success with remember password set to true', function() {
            const expectedOutput = { type: actions.SET_FORM_DATA_FIELD, key: 'password', value: 'testPassword' };
            rootEpic(packageActivatedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle success with remember password set to false', function() {
            getRememberPasswordStub.returns(false);
            const expectedOutput = { type: actions.POST_PACKAGE_ACTIVATED };
            rootEpic(packageActivatedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedOutput);
            });
        });

        it('should handle failure if StateSelector.getUsername fails', function() {
            getUsernameStub.callsFake(() => { throw error });
            rootEpic(packageActivatedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });

        it('should handle failure if StateSelector.getRememberPassword fails', function() {
            getRememberPasswordStub.callsFake(() => { throw error });
            rootEpic(packageActivatedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });

        it('should handle failure if Keychain.getCredentials fails', function() {
            getCredentialsStub.callsFake(() => { throw error });
            rootEpic(packageActivatedAction, state).subscribe((output) => {
                expect(output).to.deep.equal(expectedErrorOutput);
            });
        });
    });
});
