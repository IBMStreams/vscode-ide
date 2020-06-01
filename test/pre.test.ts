import { Registry } from '@ibmstreams/common';
import * as fse from 'fs-extra';
import * as https from 'https';
import { before, describe, it } from 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import * as unzipper from 'unzipper';
import MessageHandler from '../src/build/MessageHandler';
import { Logger } from '../src/utils';

import glob = require('glob');

describe('pre-test', function() {
    let sandbox: sinon.SinonSandbox;
    let buildSourceArchiveToolkitsPath: string;
    let simpleSplAppPath: string;
    let inetToolkitUrl: string;

    before(function() {
        buildSourceArchiveToolkitsPath = `${__dirname}${path.sep}build${path.sep}buildSourceArchive${path.sep}toolkits`;
        simpleSplAppPath = `${__dirname}${path.sep}resources${path.sep}splFiles${path.sep}simple`;
        inetToolkitUrl = 'https://codeload.github.com/IBMStreams/streamsx.inet/zip/v2.9.6';

        Logger.configure();
        Registry.setDefaultMessageHandler(new MessageHandler(null));

        // Suppress console output
        sandbox = sinon.createSandbox();
        sinon.stub(console, 'log');
        sinon.stub(console, 'error');
        sinon.stub(console, 'warn');
    });

    after(function() {
        sandbox.restore();
    });

    it('reset test directories and files', function(done) {
        try {
            if (fse.existsSync(buildSourceArchiveToolkitsPath)) {
                fse.removeSync(buildSourceArchiveToolkitsPath);
            }
            glob('.build_test_*.zip', { cwd: simpleSplAppPath }, (err, files) => {
                if (err) {
                    done(err);
                }
                files.forEach((file: string) => fse.removeSync(path.resolve(simpleSplAppPath, file)));
            });
            if (!fse.existsSync(buildSourceArchiveToolkitsPath)) {
                fse.mkdirSync(buildSourceArchiveToolkitsPath);
            }
            done();
        } catch (err) {
            done(err);
        }
    });

    it('set up toolkits for build/buildSourceArchive tests', async function() {
        // Set timeout for this test to 10s to allow for slow download
        this.timeout(10000);
        const toolkitXml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<toolkitModel xmlns="http://www.ibm.com/xmlns/prod/streams/spl/toolkit" productVersion="4.3.0.3" xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:ti="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><toolkit name="com.ibm.streamsx.inet" requiredProductVersion="4.0.1.0" version="2.9.6"></toolkit></toolkitModel>';

        await new Promise((resolve) => {
            https.get(inetToolkitUrl, (response) => {
                response.pipe(
                    unzipper.Extract({ path: buildSourceArchiveToolkitsPath, concurrency: 5 })
                        .on('close', () => {
                            fse.writeFileSync(`${buildSourceArchiveToolkitsPath}${path.sep}streamsx.inet-2.9.6${path.sep}com.ibm.streamsx.inet${path.sep}toolkit.xml`, toolkitXml);
                            resolve();
                        })
                );
            });
        });
    });
});
