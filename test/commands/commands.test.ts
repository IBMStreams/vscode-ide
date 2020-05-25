import { expect } from 'chai';
import * as fse from 'fs-extra';
import { describe, it } from 'mocha';
import * as os from 'os';
import * as path from 'path';
import * as sinon from 'sinon';
import { commands, Uri, window } from 'vscode';
import { Commands } from '../../src/commands';
import { BuiltInCommands, EXTENSION_ID } from '../../src/utils';

function readFilePromise(file: string): Promise<string> {
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
    let showInputBoxStub: sinon.SinonStub;
    let showOpenDialogStub: sinon.SinonStub;
    let command: string;

    before(function() {
        sandbox = sinon.createSandbox();
    });

    beforeEach(function() {
        executeCommandStub = sandbox.stub(commands, 'executeCommand');
        showInputBoxStub = sandbox.stub(window, 'showInputBox');
        showOpenDialogStub = sandbox.stub(window, 'showOpenDialog');
        executeCommandStub.callThrough();
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('commands should be registered', function() {
        return commands.getCommands(true).then((cmds: string[]) => {
            const STREAMS_COMMANDS = [
                Commands.GENERAL.CREATE_APPLICATION,
                Commands.GENERAL.REMOVE_OUTPUT_CHANNELS,
                Commands.BUILD.APP_DOWNLOAD,
                Commands.BUILD.APP_SUBMIT,
                Commands.BUILD.MAKE_DOWNLOAD,
                Commands.BUILD.MAKE_SUBMIT,
                Commands.BUILD.SUBMIT,
                Commands.ENVIRONMENT.CPD_OPEN_CONSOLE,
                Commands.ENVIRONMENT.CPD_OPEN_DASHBOARD,
                Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_CONSOLE,
                Commands.ENVIRONMENT.STREAMING_ANALYTICS_OPEN_DASHBOARD,
                Commands.ENVIRONMENT.STREAMS_STANDALONE_OPEN_CONSOLE,
                Commands.ENVIRONMENT.SHOW_JOB_GRAPH,
                Commands.ENVIRONMENT.TOOLKIT_PATHS_SET,
                Commands.ENVIRONMENT.TOOLKITS_LIST,
                Commands.ENVIRONMENT.TOOLKITS_REFRESH,
                // Internal
                Commands.BUILD.CONFIGURE_JOB_SUBMISSION,
                Commands.ENVIRONMENT.SHOW_AUTHENTICATION_WEBVIEW_PANEL,
                Commands.ENVIRONMENT.SHOW_INSTANCE_WEBVIEW_PANEL,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.GENERAL.ADD_INSTANCE,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.GENERAL.REMOVE_INSTANCES,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.GENERAL.REFRESH_INSTANCES,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.INSTANCE.AUTHENTICATE,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.INSTANCE.OPEN_CPD_DETAILS,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.INSTANCE.OPEN_CONSOLE,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.INSTANCE.SET_DEFAULT,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.INSTANCE.REMOVE,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.INSTANCE.REFRESH,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.JOB.OPEN_CPD_DETAILS,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.JOB.OPEN_CPD_PROJECT,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.JOB.DOWNLOAD_LOGS,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_INSTANCES.JOB.CANCEL_JOB,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_DETAILS.SHOW_DETAILS_FOR_ITEM,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_DETAILS.COPY_TO_CLIPBOARD,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_TOOLKITS.REFRESH_TOOLKITS,
                Commands.VIEW.STREAMS_EXPLORER.STREAMS_TOOLKITS.EDIT_LOCAL_TOOLKITS
            ];
            const foundStreamsCommands = cmds.filter((cmd: string) => (STREAMS_COMMANDS.includes(cmd) || cmd.startsWith(`${EXTENSION_ID}.`)));
            expect(foundStreamsCommands.length).to.equal(STREAMS_COMMANDS.length);
        });
    });

    describe(Commands.GENERAL.CREATE_APPLICATION, function() {
        let rootDir: string;
        let uri: Uri[];
        let testNamespace: string;
        let testComposite: string;
        let splFilePath: string;
        let infoXmlFilePath: string;

        before(function() {
            command = Commands.GENERAL.CREATE_APPLICATION;
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
            await commands.executeCommand(BuiltInCommands.CloseAllEditors);
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

            const visibleEditors = window.visibleTextEditors.map((textEditor) => textEditor.document.uri.fsPath.toLocaleLowerCase());
            expect(visibleEditors).to.include.members([splFilePath.toLocaleLowerCase()]);
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
});
