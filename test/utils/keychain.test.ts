import { expect } from 'chai';
import { describe, it } from 'mocha';
import { Keychain } from '../../src/utils';

describe('keychain', function() {
    const user = 'testUser';
    const password = 'testPassword';

    beforeEach(async function() {
        await Keychain.deleteCredentials(user);
    });

    afterEach(async function() {
        await Keychain.deleteCredentials(user);
    });

    it('#addCredentials/getCredentials()', async function() {
        await Keychain.addCredentials(user, password);
        const credentials = await Keychain.getCredentials(user);
        expect(credentials).to.equal(password);
    });

    it('#deleteCredentials()', async function() {
        await Keychain.addCredentials(user, password);
        const result = await Keychain.deleteCredentials(user);
        expect(result).to.be.true;
        const credentials = await Keychain.getCredentials(user);
        expect(credentials).to.be.null;
    });
});
