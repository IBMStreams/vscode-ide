import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as path from 'path';
import { StreamsUtils } from '../../../../src/build/v5/util';

describe('streams-utils', function() {
    let splFilesPath: string;

    before(function() {
        splFilesPath = `${__dirname}${path.sep}..${path.sep}..${path.sep}..${path.sep}resources${path.sep}splFiles`;
    });

    describe('#getFqnMainComposites()', function() {
        it('no namespace and single composite', function() {
            const fqnMainComposites = StreamsUtils.getFqnMainComposites(`${splFilesPath}${path.sep}simple${path.sep}simpleApp.spl`);
            const expectedOutput = { fqn: 'test', namespace: '', mainComposites: ['test'] };
            expect(fqnMainComposites).to.deep.equal(expectedOutput);
        });

        it('no namespace and multiple composites', function() {
            const fqnMainComposites = StreamsUtils.getFqnMainComposites(`${splFilesPath}${path.sep}utils${path.sep}twoCompositesApp.spl`);
            const expectedOutput = { fqn: '', namespace: '', mainComposites: ['testName1', 'testName2'] };
            expect(fqnMainComposites).to.deep.equal(expectedOutput);
        });
    });

    it('#parseV4ServiceCredentials()', function() {
        const parsedCreds = StreamsUtils.parseV4ServiceCredentials('{"apikey": "test key",\n"iam_apikey_description": "test description",\n"iam_apikey_name": "test name",\n"iam_role_crn": "test role",\n"iam_serviceid_crn": "test id",\n"v2_rest_url": "test url"}');
        const expectedOutput = {
            apikey: 'test key',
            iam_apikey_description: 'test description',
            iam_apikey_name: 'test name',
            iam_role_crn: 'test role',
            iam_serviceid_crn: 'test id',
            v2_rest_url: 'test url'
        };
        expect(parsedCreds).to.deep.equal(expectedOutput);
    });
});
