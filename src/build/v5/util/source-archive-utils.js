import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';

import { from } from 'rxjs';
import { actions } from '../actions';
import MessageHandlerRegistry from '../../message-handler-registry';

const archiver = require('archiver');

const defaultIgnoreFiles = [
  '.git',
  '.project',
  '.classpath',
  'toolkit.xml',
  '.build*zip',
  '___bundle.zip'
];

const defaultIgnoreDirectories = [
  'output',
  'doc',
  'samples',
  'opt/client',
  '.settings',
  '.apt_generated',
  '.build*',
  '___bundle'
];

function observableBuildSourceArchive(options) {
  return from(buildSourceArchive(options));
}

async function buildSourceArchive(
  {
    buildId,
    appRoot,
    toolkitRootPath,
    fqn,
    makefilePath,
    bundleToolkits
  } = {
    bundleToolkits: false
  }
) {
  const useMakefile = typeof (makefilePath) === 'string';

  let messageHandler;
  let displayPath = null;
  if (useMakefile) {
    messageHandler = MessageHandlerRegistry.get(makefilePath);
    displayPath = `${path.basename(appRoot)}${path.sep}${path.relative(appRoot, makefilePath)}`;
  } else {
    messageHandler = MessageHandlerRegistry.get(fqn);
  }

  const appRootContents = fs.readdirSync(appRoot);
  const makefilesFound = appRootContents.filter(entry => typeof (entry) === 'string' && entry.toLowerCase() === 'makefile');

  const buildTarget = useMakefile ? ` for ${displayPath}` : ` for ${fqn}`;
  messageHandler.handleInfo(`Building application archive${buildTarget}...`);

  // temporary build archive filename is of format
  // .build_[fqn]_[time].zip or .build_make_[parent_dir]_[time].zip for makefile build
  // eg: .build_sample.Vwap_1547066810853.zip , .build_make_Vwap_1547066810853.zip
  const outputFilePath = `${appRoot}${path.sep}.build_${useMakefile ? `make_${appRoot.split(path.sep).pop()}` : fqn.replace('::', '.')}_${Date.now()}.zip`;

  // delete existing build archive file before creating new one
  // TODO: handle if file is open better (windows file locks)
  try {
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
    }

    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // compression level
    });
    output.on('close', () => {
      messageHandler.handleInfo('Application archive created, submitting to build service...');
    });
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(output);

    let newMakefilePath = '';

    const toolkitPaths = getToolkits(toolkitRootPath);
    let tkPathString = '';
    if (toolkitPaths) {
      const rootContents = fs.readdirSync(appRoot);
      const newRoot = path.basename(appRoot);
      let ignoreFiles = defaultIgnoreFiles;

      // if building for specific main composite, ignore makefile
      if (!useMakefile) {
        ignoreFiles = ignoreFiles.concat(makefilesFound);
      }
      const ignoreDirs = defaultIgnoreDirectories.map(entry => `${entry}`);
      // Add files
      rootContents
        .filter(item => fs.lstatSync(`${appRoot}/${item}`).isFile())
        .filter(item => !_.some(ignoreFiles, name => {
          if (name.includes('*')) {
            const regex = new RegExp(name.replace('.', '\.').replace('*', '.*'));
            return regex.test(item);
          }
          return item.includes(name);
        }))
        .forEach(item => archive.append(fs.readFileSync(`${appRoot}/${item}`), { name: `${newRoot}/${item}` }));

      // Add directories
      rootContents
        .filter(item => fs.lstatSync(`${appRoot}/${item}`).isDirectory())
        .filter(item => !_.some(ignoreDirs, name => {
          if (name.includes('*')) {
            const regex = new RegExp(name.replace('.', '\.').replace('*', '.*'));
            return regex.test(item);
          }
          return item.includes(name);
        }))
        .forEach(item => archive.directory(`${appRoot}/${item}`, `${newRoot}/${item}`));

      toolkitPaths.forEach(tk => archive.directory(tk.tkPath, `toolkits/${tk.tk}`));
      tkPathString = ':../toolkits';
      newMakefilePath = `${newRoot}/`;

      // Call the real Makefile
      const newCommand = `main:\n\tmake -C ${newRoot}`;
      archive.append(newCommand, { name: 'Makefile' });
    } else {
      let ignoreList = defaultIgnoreFiles.concat(defaultIgnoreDirectories).map(entry => `${entry}/**`);
      if (!useMakefile) {
        ignoreList = ignoreList.concat(makefilesFound);
      }
      archive.glob('**/*', {
        cwd: `${appRoot}/`,
        ignore: ignoreList
      });
    }

    // if building specific main composite, generate a makefile
    if (fqn) {
      const makeCmd = `main:\n\tsc -M ${fqn} -t $$STREAMS_INSTALL/toolkits${tkPathString}`;
      archive.append(makeCmd, { name: `${newMakefilePath}/Makefile` });
    }
    await archive.finalize();
    // return from(archive.finalize());
    return { type: actions.SOURCE_ARCHIVE_CREATED, archivePath: outputFilePath, buildId };
  } catch (err) {
    messageHandler.handleError(err.name, { detail: err.message, stack: err.stack, consoleErrorLog: false });
    return { archivePromise: Promise.reject(err), archivePath: outputFilePath, buildId };
  }
  // return { archivePath: outputFilePath, buildId };
  // return outputFilePath;
}

function getToolkits(toolkitRootDir) {
  let validToolkitPaths = null;
  if (toolkitRootDir && toolkitRootDir.trim() !== '') {
    if (fs.existsSync(toolkitRootDir)) {
      const toolkitRootContents = fs.readdirSync(toolkitRootDir);
      validToolkitPaths = toolkitRootContents
        .filter(item => fs.lstatSync(`${toolkitRootDir}${path.sep}${item}`).isDirectory())
        .filter(dir => fs.readdirSync(`${toolkitRootDir}${path.sep}${dir}`).filter(tkDirItem => tkDirItem === 'toolkit.xml').length > 0)
        .map(tk => ({ tk, tkPath: `${toolkitRootDir}${path.sep}${tk}` }));
    }
  }
  return validToolkitPaths;
}

function getApplicationRoot(rootDirArray, filePath) {
  if (typeof (filePath) === 'string' && Array.isArray(rootDirArray)) {
    let appDir = path.dirname(filePath);
    const notWorkspaceFolder = dir => (
      !_.some(rootDirArray, folder => folder === dir)
    );
    const noMatchingFiles = dir => !fs.existsSync(`${dir}${path.sep}info.xml`) && !fs.existsSync(`${dir}${path.sep}toolkit.xml`) && !fs.existsSync(`${dir}${path.sep}Makefile`) && !fs.existsSync(`${dir}${path.sep}makefile`);
    while (notWorkspaceFolder(appDir) && noMatchingFiles(appDir)) {
      appDir = path.resolve(`${appDir}${path.sep}..`);
    }
    return appDir;
  }
  throw new Error('Error getting application root path');
}

const SourceArchiveUtils = {
  buildSourceArchive,
  getToolkits,
  getApplicationRoot,
  observableBuildSourceArchive
};

export default SourceArchiveUtils;
