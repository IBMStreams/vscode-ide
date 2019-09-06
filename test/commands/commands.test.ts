import { expect } from 'chai';
import * as fse from 'fs-extra';
import { describe, it } from 'mocha';
import * as os from 'os';
import * as path from 'path';
import * as sinon from 'sinon';
import {
    commands,
    ConfigurationTarget,
    Uri,
    window,
    workspace
} from 'vscode';
import { ibmCloudDashboardUrl } from '../../src/build/v4/spl-build-common';
import { Commands } from '../../src/commands';
import { Settings } from '../../src/utils';

function getSetting(setting: string) {
    return workspace.getConfiguration().get(setting);
}

function setSetting(setting: string, value: any) {
    return workspace.getConfiguration().update(setting, value, ConfigurationTarget.Global);
}

function setTargetVersion(version: string): Thenable<void> {
    const options = Settings.TARGET_VERSION_OPTION;
    return setSetting(Settings.TARGET_VERSION, version === 'V4' ? options.V4 : options.V5);
}

function readFilePromise(file: string): Promise<String> {
    return new Promise((resolve, reject) => {
        fse.readFile(file, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

describe('commands', function() {
    let sandbox: sinon.SinonSandbox;
    let executeCommandStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let showInputBoxStub: sinon.SinonStub;
    let showOpenDialogStub: sinon.SinonStub;
    let showQuickPickStub: sinon.SinonStub;
    let showWarningMessageStub: sinon.SinonStub;
    let vscodeOpenStub: sinon.SinonStub;
    let command: string;
    let setting: string;
    let defaultValue: string;

    before(function() {
        sandbox = sinon.createSandbox();
    });

    beforeEach(function() {
        executeCommandStub = sandbox.stub(commands, 'executeCommand');
        showErrorMessageStub = sandbox.stub(window, 'showErrorMessage');
        showInputBoxStub = sandbox.stub(window, 'showInputBox');
        showOpenDialogStub = sandbox.stub(window, 'showOpenDialog');
        showQuickPickStub = sandbox.stub(window, 'showQuickPick');
        showWarningMessageStub = sandbox.stub(window, 'showWarningMessage');
        vscodeOpenStub = executeCommandStub.withArgs('vscode.open');
        executeCommandStub.callThrough();
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('commands should be registered', function() {
        return commands.getCommands(true).then((cmds: string[]) => {
            const STREAMS_COMMANDS = [
                Commands.BUILD_APP_DOWNLOAD,
                Commands.BUILD_APP_SUBMIT,
                Commands.BUILD_MAKE_DOWNLOAD,
                Commands.BUILD_MAKE_SUBMIT,
                Commands.CREATE_APPLICATION,
                Commands.LIST_TOOLKITS,
                Commands.OPEN_CLOUD_DASHBOARD,
                Commands.OPEN_ICP4D_DASHBOARD,
                Commands.OPEN_STREAMING_ANALYTICS_CONSOLE,
                Commands.OPEN_STREAMS_CONSOLE,
                Commands.REFRESH_TOOLKITS,
                Commands.REMOVE_OUTPUT_CHANNELS,
                Commands.SET_ICP4D_URL,
                Commands.SET_SERVICE_CREDENTIALS,
                Commands.SET_TARGET_VERSION,
                Commands.SET_TOOLKITS_PATH,
                Commands.SHOW_ICP4D_SETTINGS_WEBVIEW_PANEL,
                Commands.SUBMIT
            ];
            const foundStreamsCommands = cmds.filter((cmd: string) => {
                return STREAMS_COMMANDS.includes(cmd) || cmd.startsWith('ibm-streams.');
            });
            expect(foundStreamsCommands.length).to.equal(STREAMS_COMMANDS.length);
        });
    });

    describe('ibm-streams.createApplication', function() {
        let rootDir: string;
        let uri: Uri[];
        let testNamespace: string;
        let testComposite: string;
        let splFilePath: string;
        let infoXmlFilePath: string;

        before(function() {
            command = Commands.CREATE_APPLICATION;
            rootDir = `${os.tmpdir()}${path.sep}vscode_streams_test_createApplication`;
            uri = [Uri.file(rootDir)];
            testNamespace = 'myNamespace';
            testComposite = 'myComposite';
            splFilePath = `${rootDir}${path.sep}${testNamespace}${path.sep}${testComposite}.spl`;
            infoXmlFilePath = `${rootDir}${path.sep}info.xml`;
            if (!fse.existsSync(rootDir)) {
                fse.mkdirSync(rootDir);
            }
        });

        afterEach(function() {
            showOpenDialogStub.restore();
            showInputBoxStub.restore();
            if (fse.existsSync(`${rootDir}${path.sep}${testNamespace}`)) {
                fse.removeSync(`${rootDir}${path.sep}${testNamespace}`);
            }
            if (fse.existsSync(infoXmlFilePath)) {
                fse.removeSync(infoXmlFilePath);
            }
        });

        after(async function() {
            await commands.executeCommand('workbench.action.closeAllEditors');
            if (fse.existsSync(rootDir)) {
                fse.removeSync(rootDir);
            }
        });

        it('should create application', async function() {
            showOpenDialogStub.resolves(uri);
            showInputBoxStub.onFirstCall().resolves(testNamespace);
            showInputBoxStub.onSecondCall().resolves(testComposite);
            await commands.executeCommand(command);
            await sleep(2000);

            expect(showOpenDialogStub.calledOnce).to.be.true;
            expect(showInputBoxStub.calledTwice).to.be.true;

            expect(fse.existsSync(`${rootDir}${path.sep}${testNamespace}`)).to.be.true;
            expect(fse.existsSync(splFilePath)).to.be.true;
            const splFileContents = await readFilePromise(splFilePath);
            expect(splFileContents).to.equal(`namespace ${testNamespace};\n\ncomposite ${testComposite} {\n\n}`);
            expect(fse.existsSync(infoXmlFilePath)).to.be.true;
            const infoXmlFileContents = await readFilePromise(infoXmlFilePath);
            expect(infoXmlFileContents).to.equal(`<?xml version="1.0" encoding="UTF-8"?>\n<info:toolkitInfoModel xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:info="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo">\n  <info:identity>\n    <info:name>${testComposite}</info:name>\n    <info:description>YOUR_TOOLKIT_DESCRIPTION</info:description>\n    <info:version>1.0.0</info:version>\n    <info:requiredProductVersion>4.3.0.0</info:requiredProductVersion>\n  </info:identity>\n  <info:dependencies/>\n</info:toolkitInfoModel>`);

            const visibleEditors = window.visibleTextEditors.map((textEditor) => textEditor.document.uri.fsPath);
            expect(visibleEditors).to.include.members([splFilePath]);
        });

        it('should not create application if user does not provide a namespace', async function() {
            try {
                showOpenDialogStub.resolves(uri);
                showInputBoxStub.onFirstCall().resolves(undefined);
                await commands.executeCommand(command);
            } catch (e) {
                expect(e.stack).to.contain('Error: Application creation canceled, a namespace was not specified');

                expect(showOpenDialogStub.calledOnce).to.be.true;
                expect(showInputBoxStub.calledOnce).to.be.true;

                expect(fse.existsSync(`${rootDir}${path.sep}${testNamespace}`)).to.be.false;
                expect(fse.existsSync(splFilePath)).to.be.false;
                expect(fse.existsSync(infoXmlFilePath)).to.be.false;
            }
        });

        it('should not create application if user does not provide a composite', async function() {
            try {
                showOpenDialogStub.resolves(uri);
                showInputBoxStub.onFirstCall().resolves(testComposite);
                showInputBoxStub.onSecondCall().resolves(undefined);
                await commands.executeCommand(command);
            } catch (e) {
                expect(e.stack).to.contain('Error: Application creation canceled, a composite was not specified');

                expect(showOpenDialogStub.calledOnce).to.be.true;
                expect(showInputBoxStub.calledTwice).to.be.true;

                expect(fse.existsSync(`${rootDir}${path.sep}${testNamespace}`)).to.be.false;
                expect(fse.existsSync(splFilePath)).to.be.false;
                expect(fse.existsSync(infoXmlFilePath)).to.be.false;
            }
        });
    });

    describe('ibm-streams.icp4d.openConsole', function() {
        before(async function() {
            command = Commands.OPEN_STREAMS_CONSOLE;
            await setTargetVersion('V5');
        });

        afterEach(function() {
            showErrorMessageStub.restore();
        });

        it('should show warning message if icp4d url is not valid', async function() {
            await setSetting(Settings.ICP4D_URL, 'https://HOST:PORT');
            showErrorMessageStub.resolves('Set URL');

            await commands.executeCommand(command);
            expect(vscodeOpenStub.notCalled).to.be.true;
            expect(showErrorMessageStub.calledOnce).to.be.true;
            expect(showErrorMessageStub.firstCall.args[0]).to.equal('IBM Cloud Pak for Data URL is not specified, is invalid, or is unreachable');
            expect(showErrorMessageStub.firstCall.args[1]).to.equal('Set URL');
            expect(executeCommandStub.calledTwice).to.be.true;
            expect(executeCommandStub.secondCall.args[0]).to.equal(Commands.SET_ICP4D_URL);
            expect(showInputBoxStub.calledOnce).to.be.true;
        });
    });

    describe('ibm-streams.icp4d.openDashboard', function() {
        before(async function() {
            command = Commands.OPEN_ICP4D_DASHBOARD;
            await setTargetVersion('V5');
        });

        afterEach(function() {
            showErrorMessageStub.restore();
        });

        it('should show warning message if icp4d url is not valid', async function() {
            await setSetting(Settings.ICP4D_URL, 'https://HOST:PORT');
            showErrorMessageStub.resolves('Set URL');

            await commands.executeCommand(command);
            expect(vscodeOpenStub.notCalled).to.be.true;
            expect(showErrorMessageStub.calledOnce).to.be.true;
            expect(showErrorMessageStub.firstCall.args[0]).to.equal('IBM Cloud Pak for Data URL is not specified, is invalid, or is unreachable');
            expect(showErrorMessageStub.firstCall.args[1]).to.equal('Set URL');
            expect(executeCommandStub.calledTwice).to.be.true;
            expect(executeCommandStub.secondCall.args[0]).to.equal(Commands.SET_ICP4D_URL);
            expect(showInputBoxStub.calledOnce).to.be.true;
        });
    });

    describe('ibm-streams.icp4d.setUrl', function() {
        let testUrl: string;

        before(async function() {
            command = Commands.SET_ICP4D_URL;
            setting = Settings.ICP4D_URL;
            defaultValue = 'https://HOST:PORT';
            testUrl = 'https://123.45.67.89:31843';
            await setTargetVersion('V5');
        });

        beforeEach(async function() {
            await setSetting(setting, defaultValue);
        });

        afterEach(async function() {
            showInputBoxStub.restore();
            await setSetting(setting, defaultValue);
        });

        it('should set value when passing valid URL', async function() {
            showInputBoxStub.resolves(testUrl);
            const value = await commands.executeCommand(command);
            expect(showInputBoxStub.calledOnce).to.be.true;
            expect(value).to.equal(testUrl);
            expect(getSetting(setting)).to.equal(testUrl);
        });

        it('should set value when passing an empty URL', async function() {
            showInputBoxStub.resolves('');
            const value = await commands.executeCommand(command);
            expect(showInputBoxStub.calledOnce).to.be.true;
            expect(value).to.equal('');
            expect(getSetting(setting)).to.equal('');
        });

        it('should not set value when input box is canceled', async function() {
            showInputBoxStub.resolves(undefined);
            const value = await commands.executeCommand(command);
            expect(showInputBoxStub.calledOnce).to.be.true;
            expect(value).to.be.undefined;
            expect(getSetting(setting)).to.equal(defaultValue);
        });
    });

    describe('ibm-streams.setTargetVersion', function() {
        let testVersion: string;

        before(function() {
            command = Commands.SET_TARGET_VERSION;
            setting = Settings.TARGET_VERSION;
            defaultValue = Settings.TARGET_VERSION_OPTION.V4;
            testVersion = Settings.TARGET_VERSION_OPTION.V5;
        });

        beforeEach(async function() {
            await setSetting(setting, defaultValue);
        });

        afterEach(async function() {
            showQuickPickStub.restore();
            await setSetting(setting, defaultValue);
        });

        it('should set value when picking a valid option', async function() {
            showQuickPickStub.resolves(testVersion);
            const value = await commands.executeCommand(command);
            expect(showQuickPickStub.calledOnce).to.be.true;
            expect(value).to.equal(testVersion);
            expect(getSetting(setting)).to.equal(testVersion);
        });

        it('should not set value when quick pick is canceled', async function() {
            showQuickPickStub.resolves(undefined);
            const value = await commands.executeCommand(command);
            expect(showQuickPickStub.calledOnce).to.be.true;
            expect(value).to.be.undefined;
            expect(getSetting(setting)).to.equal(defaultValue);
        });
    });

    describe('ibm-streams.streamingAnalytics.openConsole', function() {
        let testCredentials;

        before(async function() {
            command = Commands.OPEN_STREAMING_ANALYTICS_CONSOLE;
            testCredentials = {
                apikey: '12345',
                iam_apikey_description: 'test apikey',
                iam_apikey_name: 'test-apikey',
                iam_role_crn: 'crn:role:test',
                iam_serviceid_crn: 'crn:serviceid:test',
                v2_rest_url: 'https://www.ibm.com'
            };
            await setTargetVersion('V4');
        });

        afterEach(function() {
            showWarningMessageStub.restore();
        });

        it('should open console if credentials are valid', async function() {
            await setSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS, testCredentials);

            await commands.executeCommand(command);
            expect(showWarningMessageStub.notCalled).to.be.true;
        });

        it('should show warning message if credentials are not valid', async function() {
            await setSetting(Settings.STREAMING_ANALYTICS_CREDENTIALS, null);
            showWarningMessageStub.resolves('Set credentials');

            await commands.executeCommand(command);
            expect(vscodeOpenStub.notCalled).to.be.true;
            expect(showWarningMessageStub.calledOnce).to.be.true;
            expect(showWarningMessageStub.firstCall.args[0]).to.equal('IBM Streaming Analytics service credentials are not set');
            expect(showWarningMessageStub.firstCall.args[1]).to.equal('Set credentials');
            expect(showInputBoxStub.calledOnce).to.be.true;
        });
    });

    describe('ibm-streams.streamingAnalytics.openDashboard', function() {
        before(async function() {
            command = Commands.OPEN_CLOUD_DASHBOARD;
            await setTargetVersion('V4');
        });

        afterEach(function() {
            showWarningMessageStub.restore();
        });

        it('should open cloud dashboard', async function() {
            vscodeOpenStub.resolves(null);
            await commands.executeCommand(command);
            expect(vscodeOpenStub.calledOnce).to.be.true;
            const uri = vscodeOpenStub.firstCall.args[1];
            const url = uri.toString(true);
            expect(url).to.equal(ibmCloudDashboardUrl);
        });
    });

    describe('ibm-streams.streamingAnalytics.setServiceCredentials', function() {
        let testCredentials;

        before(async function() {
            command = Commands.SET_SERVICE_CREDENTIALS;
            setting = Settings.STREAMING_ANALYTICS_CREDENTIALS;
            defaultValue = null;
            testCredentials = {
                apikey: '12345',
                iam_apikey_description: 'test apikey',
                iam_apikey_name: 'test-apikey',
                iam_role_crn: 'crn:role:test',
                iam_serviceid_crn: 'crn:serviceid:test',
                v2_rest_url: 'https://www.ibm.com'
            };
            await setTargetVersion('V4');
        });

        beforeEach(async function() {
            await setSetting(setting, defaultValue);
        });

        afterEach(async function() {
            showInputBoxStub.restore();
            await setSetting(setting, defaultValue);
        });

        it('should set value when passing valid JSON credentials', async function() {
            showInputBoxStub.resolves(JSON.stringify(testCredentials));
            const value = await commands.executeCommand(command);
            expect(showInputBoxStub.calledOnce).to.be.true;
            expect(value).to.deep.equal(testCredentials);
            expect(getSetting(setting)).to.deep.equal(testCredentials);
        });

        it('should throw an error when passing invalid JSON credentials', async function() {
            showInputBoxStub.resolves('{ "bad json" }');
            try {
                await commands.executeCommand(command);
            } catch (e) {
                expect(showInputBoxStub.calledOnce).to.be.true;
                expect(e.stack).to.contain('SyntaxError: Unexpected token } in JSON at position 13');
                expect(getSetting(setting)).to.be.null;
            }
        });

        it('should throw an error when passing empty credentials', async function() {
            showInputBoxStub.resolves('');
            try {
                await commands.executeCommand(command);
            } catch (e) {
                expect(showInputBoxStub.calledOnce).to.be.true;
                expect(e.stack).to.contain('SyntaxError: Unexpected end of JSON input');
                expect(getSetting(setting)).to.be.null;
            }
        });

        it('should not set value when input box is canceled', async function() {
            showInputBoxStub.resolves(undefined);
            const value = await commands.executeCommand(command);
            expect(showInputBoxStub.calledOnce).to.be.true;
            expect(value).to.be.undefined;
            expect(getSetting(setting)).to.equal(defaultValue);
        });
    });

    describe('ibm-streams.toolkits.setPaths', function() {
        let testPath: string;

        beforeEach(async function() {
            command = Commands.SET_TOOLKITS_PATH;
            setting = Settings.TOOLKIT_PATHS;
            defaultValue = Settings.TOOLKIT_PATHS_DEFAULT;
            testPath = '/my/test/path';
            await setSetting(setting, defaultValue);
        });

        afterEach(async function() {
            showInputBoxStub.restore();
            await setSetting(setting, defaultValue);
        });

        it('should set value when passing valid path', async function() {
            showInputBoxStub.resolves(testPath);
            const value = await commands.executeCommand(command);
            expect(showInputBoxStub.calledOnce).to.be.true;
            expect(value).to.equal(testPath);
            expect(getSetting(setting)).to.equal(testPath);
        });

        it('should set value when passing an empty path', async function() {
            showInputBoxStub.resolves('');
            const value = await commands.executeCommand(command);
            expect(showInputBoxStub.calledOnce).to.be.true;
            expect(value).to.equal('');
            expect(getSetting(setting)).to.equal('');
        });

        it('should not set value when input box is canceled', async function() {
            showInputBoxStub.resolves(undefined);
            const value = await commands.executeCommand(command);
            expect(showInputBoxStub.calledOnce).to.be.true;
            expect(value).to.be.undefined;
            expect(getSetting(setting)).to.equal(defaultValue);
        });
    });
});
