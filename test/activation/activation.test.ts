import { expect } from 'chai';
import { describe, it } from 'mocha';
import { extensions } from 'vscode';
import { Constants } from '../../src/utils';

describe('activation', () => {
    it('extension should be present', function() {
        expect(extensions.getExtension(Constants.EXTENSION_ID)).to.be.ok;
    });

    it('extension should be activated', async function() {
        const extension = extensions.getExtension(Constants.EXTENSION_ID);
        expect(extension.isActive).to.equal(true);
    });
});
