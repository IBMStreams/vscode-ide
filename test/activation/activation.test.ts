import { expect } from 'chai';
import { describe, it } from 'mocha';
import { extensions } from 'vscode';
import { EXTENSION_QUALIFIED_ID } from '../../src/utils';

describe('activation', () => {
  it('extension should be present', function () {
    expect(extensions.getExtension(EXTENSION_QUALIFIED_ID)).to.be.ok;
  });

  it('extension should be activated', async function () {
    const extension = extensions.getExtension(EXTENSION_QUALIFIED_ID);
    expect(extension.isActive).to.equal(true);
  });
});
