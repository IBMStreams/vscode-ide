import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as path from 'path';
import MessageHandlerRegistry from '../../../../src/build/message-handler-registry';
import MessageHandler from '../../../../src/build/MessageHandler';
import { SourceArchiveUtils } from '../../../../src/build/v5/util';
import { Logger } from '../../../../src/utils';
import { actions } from '../../../../src/build/v5/actions';

describe('source-archive-utils', function() {
    let toolkitsPath;
    let splFilesPath;

    before(function() {
        toolkitsPath = `${__dirname}${path.sep}..${path.sep}..${path.sep}buildSourceArchive${path.sep}toolkits${path.sep}streamsx.inet-2.9.6`;
        splFilesPath = `${__dirname}${path.sep}..${path.sep}..${path.sep}..${path.sep}resources${path.sep}splFiles`;
    });

    it('#buildSourceArchive()', async function() {
        const appRoot = `${splFilesPath}${path.sep}simple`;
        const filePath = `${appRoot}${path.sep}simpleApp.spl`;
        const fqn = 'test';

        const messageHandler = new MessageHandler({ appRoot, filePath });
        MessageHandlerRegistry.add(fqn, messageHandler);

        const displayPath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, filePath)}`;
        Logger.registerOutputChannel(filePath, displayPath);

        const archive = await SourceArchiveUtils.buildSourceArchive({
            appRoot,
            buildId: null,
            fqn,
            makefilePath: null,
            toolkitCacheDir: null,
            toolkitPathSetting: toolkitsPath
        });

        const expectedPath = `${splFilesPath}${path.sep}simple${path.sep}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const expectedPathRegEx = new RegExp(`${expectedPath}\.build_test_\\d+\.zip`);
        const expectedOutput = {
            type: actions.SOURCE_ARCHIVE_CREATED,
            buildId: null
        };
        expect(archive).to.have.all.keys('type', 'archivePath', 'buildId');
        expect(archive).to.include(expectedOutput);
        expect(archive.archivePath).to.match(expectedPathRegEx);
    });

    it('#getToolkits()', async function() {
        const toolkitName = 'com.ibm.streamsx.inet';
        const toolkits = SourceArchiveUtils.getToolkits(undefined, toolkitsPath, `${splFilesPath}${path.sep}utils`);
        expect(toolkits).to.eql([{ name: toolkitName, tkPath: `${toolkitsPath}${path.sep}${toolkitName}` }]);
    });

    it('#getApplicationRoot()', function() {
        const projectPaths = [__dirname];
        const utilsSplAppPath = `${splFilesPath}${path.sep}utils`;
        const selectedFile = `${utilsSplAppPath}${path.sep}twoCompositesApp.spl`;
        const appRoot = SourceArchiveUtils.getApplicationRoot(projectPaths, selectedFile);
        expect(appRoot).to.equal(utilsSplAppPath);
    });
});
