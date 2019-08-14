import * as extractZip from 'extract-zip';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import * as https from 'https';
import { before, describe, it } from 'mocha';
import * as path from 'path';
import * as sinon from 'sinon';
import MessageHandlerRegistry from '../src/build/message-handler-registry';
import MessageHandler from '../src/build/MessageHandler';
import { Logger } from '../src/utils';

describe('Pre Test', function() {
    let sandbox: sinon.SinonSandbox;
    let buildSourceArchiveToolkitsPath: string;
    let buildUtilsToolkitsPath: string;
    let simpleSplAppPath: string;
    let inetToolkitUrl: string;

    before(function() {
        buildSourceArchiveToolkitsPath = `${__dirname}${path.sep}build${path.sep}buildSourceArchive${path.sep}toolkits`;
        buildUtilsToolkitsPath = `${__dirname}${path.sep}build${path.sep}v5${path.sep}utils${path.sep}toolkits`;
        simpleSplAppPath = `${__dirname}${path.sep}resources${path.sep}splFiles${path.sep}simple`;
        inetToolkitUrl = 'https://codeload.github.com/IBMStreams/streamsx.inet/zip/v2.9.6';

        Logger.configure();
        MessageHandlerRegistry.setDefault(new MessageHandler(null));

        // Suppress console output
        sandbox = sinon.createSandbox();
        sinon.stub(console, 'log');
        sinon.stub(console, 'error');
        sinon.stub(console, 'warn');
    });

    after(function() {
        sandbox.restore();
    });

    it('Reset test directories and files', function(done) {
        try {
            if (fse.existsSync(buildSourceArchiveToolkitsPath)) {
                fse.removeSync(buildSourceArchiveToolkitsPath);
            }
            if (fse.existsSync(buildUtilsToolkitsPath)) {
                fse.removeSync(buildUtilsToolkitsPath);
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
            if (!fse.existsSync(buildUtilsToolkitsPath)) {
                fse.mkdirSync(buildUtilsToolkitsPath);
            }
            done();
        } catch (err) {
            done(err);
        }
    });

    it('Set up toolkits for build/buildSourceArchive tests', function(done) {
        const toolkitXml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<toolkitModel xmlns="http://www.ibm.com/xmlns/prod/streams/spl/toolkit" productVersion="4.3.0.3" xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:ti="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><toolkit name="com.ibm.streamsx.inet" requiredProductVersion="4.0.1.0" version="2.9.6"></toolkit></toolkitModel>';
        const download = (url: string, dest: string, cb: Function) => {
            const file = fse.createWriteStream(dest);
            file.on('open', () => {
                https.get(url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.end();
                        extractZip(`${buildSourceArchiveToolkitsPath}${path.sep}toolkit.zip`, { dir: buildSourceArchiveToolkitsPath }, (err) => {
                            if (err) {
                                cb(err.message);
                            }
                            fse.unlinkSync(`${buildSourceArchiveToolkitsPath}${path.sep}toolkit.zip`);
                            fse.writeFileSync(`${buildSourceArchiveToolkitsPath}${path.sep}streamsx.inet-2.9.6${path.sep}com.ibm.streamsx.inet${path.sep}toolkit.xml`, toolkitXml);
                            cb();
                        });
                    });
                }).on('error', (err) => {
                    fse.unlink(dest, null);
                    if (cb) {
                        cb(err.message);
                    }
                });
            });
        };
        download(inetToolkitUrl, `${buildSourceArchiveToolkitsPath}/toolkit.zip`, (err) => {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    it('Set up toolkits for build/utils tests', function(done) {
        const toolkitXml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<toolkitModel xmlns="http://www.ibm.com/xmlns/prod/streams/spl/toolkit" productVersion="4.3.0.3" xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:ti="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><toolkit name="com.ibm.streamsx.inet" requiredProductVersion="4.0.1.0" version="2.9.6"></toolkit></toolkitModel>';
        const toolkitXml2 = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<toolkitModel xmlns="http://www.ibm.com/xmlns/prod/streams/spl/toolkit" productVersion="4.3.0.3" xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:ti="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><toolkit name="com.ibm.streamsx.inet2" requiredProductVersion="4.0.1.0" version="2.9.6"></toolkit></toolkitModel>';
        const download = (url: string, dest: string, cb: Function) => {
            const file = fse.createWriteStream(dest);
            file.on('open', () => {
                https.get(url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.end();
                        extractZip(`${buildUtilsToolkitsPath}${path.sep}toolkit.zip`, { dir: buildUtilsToolkitsPath }, (err) => {
                            if (err) {
                                cb(err.message);
                            }
                            fse.unlinkSync(`${buildUtilsToolkitsPath}${path.sep}toolkit.zip`);
                            fse.writeFileSync(`${buildUtilsToolkitsPath}${path.sep}streamsx.inet-2.9.6${path.sep}com.ibm.streamsx.inet${path.sep}toolkit.xml`, toolkitXml);
                            fse.mkdirSync(`${buildUtilsToolkitsPath}${path.sep}streamsx.inet-2.9.6${path.sep}com.ibm.streamsx.inet2`);
                            fse.writeFileSync(`${buildUtilsToolkitsPath}${path.sep}streamsx.inet-2.9.6${path.sep}com.ibm.streamsx.inet2${path.sep}toolkit.xml`, toolkitXml2);
                            cb();
                        });
                    });
                }).on('error', (err) => {
                    fse.unlink(dest, null);
                    if (cb) {
                        cb(err.message);
                    }
                });
            });
        };
        download(inetToolkitUrl, `${buildUtilsToolkitsPath}/toolkit.zip`, (err) => {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });
});
