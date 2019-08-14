import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as sinon from 'sinon';
import { window } from 'vscode';
import { Logger } from '../../src/utils';

describe('logger', function() {
    let sandbox: sinon.SinonSandbox;
    let showErrorMessageSpy: sinon.SinonSpy;
    let showInformationMessageSpy: sinon.SinonSpy;
    let showWarningMessageSpy: sinon.SinonSpy;

    before(function() {
        sandbox = sinon.createSandbox();
    });

    beforeEach(function() {
        showErrorMessageSpy = sandbox.spy(window, 'showErrorMessage');
        showInformationMessageSpy = sandbox.spy(window, 'showInformationMessage');
        showWarningMessageSpy = sandbox.spy(window, 'showWarningMessage');
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('#debug()', async function() {
        const testMessage = 'This is a debug message.';
        Logger.debug(null, testMessage, true);
        expect(showInformationMessageSpy.calledOnce).to.be.true;
        expect(showInformationMessageSpy.firstCall.args[0]).to.equal(testMessage);
    });

    it('#error()', async function() {
        const testMessage = 'This is an error message.';
        Logger.error(null, testMessage, true);
        expect(showErrorMessageSpy.calledOnce).to.be.true;
        expect(showErrorMessageSpy.firstCall.args[0]).to.equal(testMessage);
    });

    it('#info()', async function() {
        const testMessage = 'This is an information message.';
        Logger.info(null, testMessage, true);
        expect(showInformationMessageSpy.calledOnce).to.be.true;
        expect(showInformationMessageSpy.firstCall.args[0]).to.equal(testMessage);
    });

    it('#success()', async function() {
        const testMessage = 'This is a success message.';
        Logger.success(null, testMessage, true);
        expect(showInformationMessageSpy.calledOnce).to.be.true;
        expect(showInformationMessageSpy.firstCall.args[0]).to.equal(testMessage);
    });

    it('#warn()', async function() {
        const testMessage = 'This is a warning message.';
        Logger.warn(null, testMessage, true);
        expect(showWarningMessageSpy.calledOnce).to.be.true;
        expect(showWarningMessageSpy.firstCall.args[0]).to.equal(testMessage);
    });
});
