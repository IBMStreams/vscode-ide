import { expect } from 'chai';
import { describe, it } from 'mocha';
import { Keychain } from '../../src/utils';

describe('keychain', function () {
  const serviceName = 'testVsCodeStreamsService';
  const user = 'testUser';
  const password = 'testPassword';

  beforeEach(async function () {
    await Keychain.deleteCredentials(serviceName, user);
  });

  afterEach(async function () {
    await Keychain.deleteCredentials(serviceName, user);
  });

  it('#addCredentials/getCredentials()', async function () {
    await Keychain.addCredentials(serviceName, user, password);
    const credentials = await Keychain.getCredentials(serviceName, user);
    expect(credentials).to.equal(password);
  });

  it('#deleteCredentials()', async function () {
    await Keychain.addCredentials(serviceName, user, password);
    const result = await Keychain.deleteCredentials(serviceName, user);
    expect(result).to.be.true;
    const credentials = await Keychain.getCredentials(serviceName, user);
    expect(credentials).to.be.null;
  });
});
