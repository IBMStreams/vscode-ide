import { expect } from 'chai';
import * as _ from 'lodash';
import { describe, it } from 'mocha';
import { actions } from '../../../src/build/v5/actions';
import rootReducer from '../../../src/build/v5/reducers';

describe('reducers', function() {
    let state;
    let action;
    let expectedState;

    it('default', function() {
        expect(rootReducer(undefined, { type: null })).to.deep.equal({ streamsV5Build: [] });
    });

    it('SET_BUILD_ORIGINATOR', function() {
        action = {
            type: actions.SET_BUILD_ORIGINATOR,
            originator: 'test',
            version: '1.2.3'
        };
        state = rootReducer(undefined, action);
        expectedState = { streamsV5Build: { buildOriginator: `${action.originator}::${action.version}` } };
        expect(state).to.deep.equal(expectedState);
    });

    it('PACKAGE_ACTIVATED', function() {
        action = {
            type: actions.PACKAGE_ACTIVATED,
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, packageActivated: true } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_ICP4D_URL', function() {
        action = {
            type: actions.SET_ICP4D_URL,
            icp4dUrl: '/test/test/'
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, icp4dUrl: action.icp4dUrl } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_USE_ICP4D_MASTER_NODE_HOST', function() {
        action = {
            type: actions.SET_USE_ICP4D_MASTER_NODE_HOST,
            useIcp4dMasterNodeHost: true
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, useIcp4dMasterNodeHost: action.useIcp4dMasterNodeHost } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_CURRENT_LOGIN_STEP', function() {
        action = {
            type: actions.SET_CURRENT_LOGIN_STEP,
            currentLoginStep: 1
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, currentLoginStep: action.currentLoginStep } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_USERNAME', function() {
        action = {
            type: actions.SET_USERNAME,
            username: 'testUser'
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, formData: { ...expectedState.streamsV5Build.formData, username: action.username } } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_PASSWORD', function() {
        action = {
            type: actions.SET_PASSWORD,
            password: 'testPass'
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, formData: { ...expectedState.streamsV5Build.formData, password: action.password } } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_REMEMBER_PASSWORD', function() {
        action = {
            type: actions.SET_REMEMBER_PASSWORD,
            rememberPassword: true
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, formData: { ...expectedState.streamsV5Build.formData, rememberPassword: action.rememberPassword } } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_FORM_DATA_FIELD', function() {
        action = {
            type: actions.SET_FORM_DATA_FIELD,
            key: 'username',
            value: 'testUserChanged'
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, formData: { ...expectedState.streamsV5Build.formData, [action.key]: action.value } } };
        expect(state).to.deep.equal(expectedState);
    });

    it('QUEUE_ACTION', function() {
        action = {
            type: actions.QUEUE_ACTION,
            queuedAction: { type: 'test', test: 'test' }
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, queuedAction: action.queuedAction } };
        expect(state).to.deep.equal(expectedState);
    });

    it('CLEAR_QUEUED_ACTION', function() {
        action = {
            type: actions.CLEAR_QUEUED_ACTION
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, queuedAction: null } };
        expect(state).to.deep.equal(expectedState);
    });

    it('AUTHENTICATE_ICP4D', function() {
        action = {
            type: actions.AUTHENTICATE_ICP4D,
            username: 'testUser',
            password: 'testPass',
            rememberPassword: false
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, username: action.username, rememberPassword: false } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_STREAMS_INSTANCES', function() {
        action = {
            type: actions.SET_STREAMS_INSTANCES,
            streamsInstances: [{ ID: 'test' }]
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, streamsInstances: action.streamsInstances } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_SELECTED_INSTANCE', function() {
        const streamsInstance = {
            ID: '001',
            ServiceInstanceDisplayName: 'test',
            ServiceInstanceVersion: '1.2.3',
            CreateArguments: {
                'connection-info': {
                    externalRestEndpoint: 'testRest',
                    externalBuildEndpoint: 'testBuild',
                    externalConsoleEndpoint: 'testConsole',
                    externalJmxEndpoint: 'testJmx'
                }
            }
        };
        action = {
            type: actions.SET_SELECTED_INSTANCE,
            ...streamsInstance,
            currentLoginStep: 3
        };
        state = rootReducer(state, action);
        expectedState = {
            streamsV5Build: {
                ...expectedState.streamsV5Build,
                currentLoginStep: 3,
                selectedInstance: {
                    serviceInstanceId: action.ID,
                    instanceName: action.ServiceInstanceDisplayName,
                    serviceInstanceVersion: action.ServiceInstanceVersion,
                    streamsRestUrl: action.CreateArguments['connection-info'].externalRestEndpoint,
                    streamsBuildRestUrl: action.CreateArguments['connection-info'].externalBuildEndpoint,
                    streamsConsoleUrl: action.CreateArguments['connection-info'].externalConsoleEndpoint,
                    streamsJmxUrl: action.CreateArguments['connection-info'].externalJmxEndpoint
                }
            }
        };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_ICP4D_AUTH_TOKEN', function() {
        action = {
            type: actions.SET_ICP4D_AUTH_TOKEN,
            authToken: { test: 'test' },
            currentLoginStep: 2
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, icp4dAuthToken: action.authToken, currentLoginStep: action.currentLoginStep } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_ICP4D_AUTH_ERROR', function() {
        action = {
            type: actions.SET_ICP4D_AUTH_ERROR,
            authError: false
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, icp4dAuthError: action.authError, ...(!action.authError && { formData: {} }) } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_STREAMS_AUTH_TOKEN', function() {
        action = {
            type: actions.SET_STREAMS_AUTH_TOKEN,
            authToken: { test: 'test' }
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, selectedInstance: { ...expectedState.streamsV5Build.selectedInstance, streamsAuthToken: action.authToken } } };

        expect(state).to.deep.equal(expectedState);
    });

    it('SET_STREAMS_AUTH_ERROR', function() {
        action = {
            type: actions.SET_STREAMS_AUTH_ERROR,
            authError: false
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, streamsAuthError: action.authError } };
        expect(state).to.deep.equal(expectedState);
    });

    it('RESET_AUTH', function() {
        action = {
            type: actions.RESET_AUTH
        };
        const state2 = rootReducer(state, action);
        const expectedState2 = { streamsV5Build: { ..._.omit(expectedState.streamsV5Build, ['currentLoginStep', 'icp4dAuthToken', 'icp4dAuthError', 'streamsInstances', 'selectedInstance', 'streamsAuthError', 'username']), currentLoginStep: 1 } };
        expect(state2).to.deep.equal(expectedState2);
    });

    it('NEW_BUILD', function() {
        action = {
            type: actions.NEW_BUILD,
            appRoot: '/test/appRoot',
            toolkitRootPath: '/test/toolkits',
            fqn: 'test',
            makefilePath: '/test/makefile',
            postBuildAction: { type: 'test' }
        };
        state = rootReducer(state, action);
        expectedState = {
            streamsV5Build: {
                ...expectedState.streamsV5Build,
                builds: {
                    ...expectedState.streamsV5Build.builds,
                    [expectedState.streamsV5Build.selectedInstance.instanceName]: {
                        ...(expectedState.streamsV5Build.builds && expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName]),
                        newBuild: {
                            appRoot: action.appRoot, toolkitRootPath: action.toolkitRootPath, fqn: action.fqn, makefilePath: action.makefilePath, postBuildAction: action.postBuildAction
                        }
                    }
                }
            }
        };
        expect(state).to.deep.equal(expectedState);
    });

    it('GET_BUILD_STATUS_FULFILLED', function() {
        const buildStatusResponse = {
            status: 'test',
            inactivityTimeout: 10000,
            lastActivityTime: 1000,
            submitCount: 1,
            buildId: '001'
        };
        action = {
            type: actions.GET_BUILD_STATUS_FULFILLED,
            ...buildStatusResponse
        };
        state = rootReducer(state, action);
        expectedState = {
            streamsV5Build: {
                ...expectedState.streamsV5Build,
                builds: {
                    ...expectedState.streamsV5Build.builds,
                    [expectedState.streamsV5Build.selectedInstance.instanceName]: {
                        ...(expectedState.streamsV5Build.builds && expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName]),
                        [action.buildId]: {
                            ...expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName][action.buildId],
                            status: action.status,
                            inactivityTimeout: action.inactivityTimeout,
                            lastActivityTime: action.lastActivityTime,
                            submitCount: action.submitCount,
                            buildId: action.buildId
                        }
                    }
                }
            }
        };
        expect(state).to.deep.equal(expectedState);
    });

    it('GET_BUILD_LOG_MESSAGES_FULFILLED', function() {
        const buildLogMessagesResponse = {
            buildId: '001',
            logMessages: ['test', 'test2']
        };
        action = {
            type: actions.GET_BUILD_LOG_MESSAGES_FULFILLED,
            ...buildLogMessagesResponse
        };
        state = rootReducer(state, action);
        expectedState = {
            streamsV5Build: {
                ...expectedState.streamsV5Build,
                builds: {
                    ...expectedState.streamsV5Build.builds,
                    [expectedState.streamsV5Build.selectedInstance.instanceName]: {
                        ...(expectedState.streamsV5Build.builds && expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName]),
                        [action.buildId]: {
                            ...expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName][action.buildId],
                            logMessages: action.logMessages
                        }
                    }
                }
            }
        };
        expect(state).to.deep.equal(expectedState);
    });

    it('BUILD_UPLOAD_SOURCE', function() {
        action = {
            type: actions.BUILD_UPLOAD_SOURCE,
            buildId: '001',
            appRoot: '/test/appRoot',
            toolkitRootPath: '/test/toolkits',
            fqn: 'test',
            makefilePath: '/test/makefile'
        };
        state = rootReducer(state, action);
        expectedState = {
            streamsV5Build: {
                ...expectedState.streamsV5Build,
                builds: {
                    ...expectedState.streamsV5Build.builds,
                    [expectedState.streamsV5Build.selectedInstance.instanceName]: {
                        ...(expectedState.streamsV5Build.builds && expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName]),
                        [action.buildId]: {
                            ...expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName][action.buildId],
                            buildId: action.buildId,
                            appRoot: expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName].newBuild.appRoot,
                            toolkitRootPath: expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName].newBuild.toolkitRootPath,
                            fqn: expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName].newBuild.fqn,
                            makefilePath: expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName].newBuild.makefilePath,
                            postBuildAction: expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName].newBuild.postBuildAction
                        }
                    }
                }
            }
        };
        expect(state).to.deep.equal(expectedState);
    });

    it('GET_BUILD_ARTIFACTS_FULFILLED', function() {
        action = {
            type: actions.GET_BUILD_ARTIFACTS_FULFILLED,
            buildId: '001',
            artifacts: ['test']
        };
        state = rootReducer(state, action);
        expectedState = {
            streamsV5Build: {
                ...expectedState.streamsV5Build,
                builds: {
                    ...expectedState.streamsV5Build.builds,
                    [expectedState.streamsV5Build.selectedInstance.instanceName]: {
                        ...(expectedState.streamsV5Build.builds && expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName]),
                        [action.buildId]: {
                            ...expectedState.streamsV5Build.builds[expectedState.streamsV5Build.selectedInstance.instanceName][action.buildId],
                            artifacts: action.artifacts
                        }
                    }
                }
            }
        };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_TOOLKITS_CACHE_DIR', function() {
        action = {
            type: actions.SET_TOOLKITS_CACHE_DIR,
            toolkitsCacheDir: '/test/toolkits'
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, toolkitsCacheDir: action.toolkitsCacheDir } };
        expect(state).to.deep.equal(expectedState);
    });

    it('SET_TOOLKITS_PATH_SETTING', function() {
        action = {
            type: actions.SET_TOOLKITS_PATH_SETTING,
            toolkitsPathSetting: '/test/toolkits'
        };
        state = rootReducer(state, action);
        expectedState = { streamsV5Build: { ...expectedState.streamsV5Build, toolkitsPathSetting: action.toolkitsPathSetting } };
        expect(state).to.deep.equal(expectedState);
    });
});
