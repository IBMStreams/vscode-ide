import { Registry, SourceArchiveUtils } from '@ibmstreams/common';
import { expect } from 'chai';
import * as fs from 'fs';
import * as unzipper from 'unzipper';
import { describe, it } from 'mocha';
import * as path from 'path';
import StreamsBuild from '../../../src/build';
import MessageHandler from '../../../src/build/MessageHandler';
import { Logger } from '../../../src/utils';

function getFiles(
  dir: string,
  mainDir: string,
  folder: string,
  files_: string[]
): string[] {
  const resultFiles = files_ || [];
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    let name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      resultFiles.push(`${name.replace(mainDir, folder)}/`);
      getFiles(name, mainDir, folder, files_);
    } else if (file.match(/.build_.*zip/) === null) {
      name = name.replace(mainDir, folder);
      resultFiles.push(path.format(path.parse(name)));
    }
  });
  return resultFiles;
}

const splFilesPath = `${__dirname}${path.sep}..${path.sep}..${path.sep}resources${path.sep}splFiles`;

describe('build source archive', function () {
  let appRoot: string;
  let filePath: string;
  let fqn: string;
  let expectedPath: string;
  let expectedPathRegEx: RegExp;
  let toolkitsPath: string;
  let archivePath: string;

  describe('simple app', function () {
    before(function () {
      appRoot = `${splFilesPath}${path.sep}simple`;
      filePath = `${appRoot}${path.sep}simpleApp.spl`;
      fqn = 'HelloWorld';
      expectedPath = `${appRoot}${path.sep}`.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      expectedPathRegEx = new RegExp(
        `${expectedPath}\.build_HelloWorld_\\d+\.zip`
      );
      toolkitsPath = `${__dirname}${path.sep}..${path.sep}toolkits`;

      const messageHandler = new MessageHandler({ appRoot, filePath });
      Registry.addMessageHandler(fqn, messageHandler);

      const displayPath = StreamsBuild.getDisplayPath(
        appRoot,
        filePath,
        null,
        null
      );
      Logger.registerOutputChannel(filePath, displayPath);
    });

    it('should build archive successfully', async function () {
      archivePath = await SourceArchiveUtils.buildApplicationArchive({
        appRoot,
        fqn,
        makefilePath: null,
        toolkitsCacheDir: null,
        toolkitPathsSetting: toolkitsPath
      });
      expect(archivePath).to.match(expectedPathRegEx);
    });

    it('should have the correct files inside the archive', async function () {
      const archiveContents = await unzipper.Open.file(archivePath);
      const archiveFilenames =
        archiveContents && archiveContents.files
          ? archiveContents.files.map((fileEntry) => fileEntry.path)
          : [];
      const expectedFiles = ['Makefile', 'simpleApp.spl'];
      expect(archiveFilenames).to.have.members(expectedFiles);
      fs.unlinkSync(archivePath);
    });
  });

  describe('app with dependencies', function () {
    before(function () {
      appRoot = `${splFilesPath}${path.sep}withDependencies`;
      filePath = `${appRoot}${path.sep}appWithDependencies.spl`;
      fqn = 'NextBusIngest';
      expectedPath = `${appRoot}${path.sep}`.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      expectedPathRegEx = new RegExp(
        `${expectedPath}\.build_NextBusIngest_\\d+\.zip`
      );
      toolkitsPath = `${__dirname}${path.sep}toolkits${path.sep}streamsx.inet-2.9.6`;

      const messageHandler = new MessageHandler({ appRoot, filePath });
      Registry.addMessageHandler(fqn, messageHandler);

      const displayPath = StreamsBuild.getDisplayPath(
        appRoot,
        filePath,
        null,
        null
      );
      Logger.registerOutputChannel(filePath, displayPath);
    });

    it('should build archive successfully', async function () {
      this.timeout(7500);
      archivePath = await SourceArchiveUtils.buildApplicationArchive({
        appRoot,
        fqn,
        makefilePath: null,
        toolkitsCacheDir: null,
        toolkitPathsSetting: toolkitsPath
      });
      expect(archivePath).to.match(expectedPathRegEx);
    });

    it('should have the correct files inside the archive', async function () {
      this.timeout(15000);
      let expectedFiles = getFiles(appRoot, appRoot, 'withDependencies', []);
      expectedFiles.push('Makefile');
      expectedFiles.push('withDependencies/Makefile');
      expectedFiles = getFiles(
        `${toolkitsPath}${path.sep}com.ibm.streamsx.inet`,
        toolkitsPath,
        'toolkits',
        expectedFiles
      ).map((file) => path.format(path.parse(file)));
      const archiveContents = await unzipper.Open.file(archivePath);
      const archiveFilenames =
        archiveContents && archiveContents.files
          ? archiveContents.files.map((fileEntry) =>
              fileEntry.path.replace(/\/$/, '')
            )
          : [];
      expect(archiveFilenames).to.have.members(expectedFiles);
      fs.unlinkSync(archivePath);
    });
  });
});
