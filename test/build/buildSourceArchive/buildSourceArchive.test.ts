import { expect } from 'chai';
import * as fs from 'fs';
import * as JSZip from 'jszip';
import { describe, it } from 'mocha';
import * as path from 'path';
import MessageHandlerRegistry from '../../../src/build/message-handler-registry';
import MessageHandler from '../../../src/build/MessageHandler';
import { SourceArchiveUtils } from '../../../src/build/v5/util';
import { Logger } from '../../../src/utils';

function waitForArchive(condition: Function): Promise<void> {
    let i = 0;
    return new Promise((resolve) => {
        const intervalId = setInterval(() => {
            if (condition() || i === 10) {
                clearInterval(intervalId);
                resolve();
            }
            i += 1;
        }, 1000);
    });
}

function readFilePromise(file: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function getFiles(dir: string, mainDir: string, folder: string, files_: string[]): string[] {
    const resultFiles = files_ || [];
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        let name = `${dir}/${file}`;
        if (fs.statSync(name).isDirectory()) {
            resultFiles.push(`${name.replace(mainDir, folder)}/`);
            getFiles(name, mainDir, folder, files_);
        } else if (file.match(/.build_.*zip/) === null) {
            name = name.replace(mainDir, folder);
            resultFiles.push(name);
        }
    });
    return resultFiles;
}

const splFilesPath = `${__dirname}${path.sep}..${path.sep}..${path.sep}resources${path.sep}splFiles`;

describe('build source archive', function() {
    let appRoot: string;
    let filePath: string;
    let fqn: string;
    let expectedPath: string;
    let expectedPathRegEx: RegExp;
    let toolkitsPath: string;
    let archivePath: string;

    describe('simple app', function() {
        before(function() {
            appRoot = `${splFilesPath}${path.sep}simple`;
            filePath = `${appRoot}${path.sep}simpleApp.spl`;
            fqn = 'HelloWorld';
            expectedPath = `${appRoot}${path.sep}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            expectedPathRegEx = new RegExp(`${expectedPath}\.build_HelloWorld_\\d+\.zip`);
            toolkitsPath = `${__dirname}${path.sep}..${path.sep}toolkits`;

            const messageHandler = new MessageHandler({ appRoot, filePath });
            MessageHandlerRegistry.add(fqn, messageHandler);

            const displayPath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePath)}`;
            Logger.registerOutputChannel(filePath, displayPath);
        });

        it('should build archive successfully', async function() {
            const buildSourceArchiveOutput = await SourceArchiveUtils.buildSourceArchive({
                appRoot,
                buildId: null,
                fqn,
                makefilePath: null,
                toolkitCacheDir: null,
                toolkitPathSetting: toolkitsPath
            });
            await waitForArchive(SourceArchiveUtils.checkArchiveDone);
            archivePath = buildSourceArchiveOutput.archivePath;
            expect(SourceArchiveUtils.checkArchiveDone()).to.be.true;
            expect(archivePath).to.match(expectedPathRegEx);
        });

        it('should have the correct files inside the archive', async function() {
            const fileContent = await readFilePromise(archivePath);
            const zip = await JSZip.loadAsync(fileContent);
            const files = Object.keys(zip.files);
            const expectedFiles = ['Makefile', 'simpleApp.spl'];
            expect(files).to.have.members(expectedFiles);
            fs.unlinkSync(archivePath);
        });
    });

    describe('app with dependencies', function() {
        before(function() {
            appRoot = `${splFilesPath}${path.sep}withDependencies`;
            filePath = `${appRoot}${path.sep}appWithDependencies.spl`;
            fqn = 'NextBusIngest';
            expectedPath = `${appRoot}${path.sep}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            expectedPathRegEx = new RegExp(`${expectedPath}\.build_NextBusIngest_\\d+\.zip`);
            toolkitsPath = `${__dirname}${path.sep}toolkits${path.sep}streamsx.inet-2.9.6`;

            const messageHandler = new MessageHandler({ appRoot, filePath });
            MessageHandlerRegistry.add(fqn, messageHandler);

            const displayPath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePath)}`;
            Logger.registerOutputChannel(filePath, displayPath);
        });

        it('should build archive successfully', async function() {
            const buildSourceArchiveOutput = await SourceArchiveUtils.buildSourceArchive({
                appRoot,
                buildId: null,
                fqn,
                makefilePath: null,
                toolkitCacheDir: null,
                toolkitPathSetting: toolkitsPath
            });
            await waitForArchive(SourceArchiveUtils.checkArchiveDone);
            archivePath = buildSourceArchiveOutput.archivePath;
            expect(SourceArchiveUtils.checkArchiveDone()).to.be.true;
            expect(archivePath).to.match(expectedPathRegEx);
        });

        it('should have the correct files inside the archive', async function() {
            let expectedFiles = getFiles(appRoot, appRoot, 'withDependencies', []);
            expectedFiles.push('Makefile');
            expectedFiles.push('withDependencies/Makefile');
            expectedFiles = getFiles(`${toolkitsPath}/com.ibm.streamsx.inet`, toolkitsPath, 'toolkits', expectedFiles);

            const fileContent = await readFilePromise(archivePath);
            const zip = await JSZip.loadAsync(fileContent, { base64: true });
            const files = Object.keys(zip.files);
            expect(files).to.have.members(expectedFiles);
            fs.unlinkSync(archivePath);
        });
    });
});
