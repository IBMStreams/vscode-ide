import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as xmldoc from 'xmldoc';
import * as semver from 'semver';

import { from } from 'rxjs';
import { actions } from '../actions';
import MessageHandlerRegistry from '../../message-handler-registry';
import { StreamsToolkitsUtils } from '.';

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
let archiveDone = false;

function observableBuildSourceArchive(options) {
  return from(buildSourceArchive(options));
}

function checkArchiveDone() {
  return archiveDone;
}

async function buildSourceArchive(
  {
    buildId,
    appRoot,
    toolkitPathSetting,
    toolkitCacheDir,
    fqn,
    makefilePath
  } = {}
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
      archiveDone = true;
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

    const toolkitPaths = getToolkits(toolkitCacheDir, toolkitPathSetting, appRoot);
    let tkPathString = '';
    if (toolkitPaths && toolkitPaths.length) {
      messageHandler.handleInfo(
        'Including toolkits in source archive...',
        { detail: `Including the following toolkits with the application source:\n${toolkitPaths.map(tk => tk.tkPath).join('\n')}` }
      );
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

      toolkitPaths.forEach(tk => archive.directory(tk.tkPath, `toolkits/${tk.name}`));
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
}

function parseToolkitVersions(dependencies) {
  return dependencies.map((dep) => {
    const vr = dep.version.split(',');
    let range = '';
    if (vr.length === 2) {
      const regex = RegExp(/[[,(]\d+\.\d+\.\d+,\d+\.\d+\.\d+[\],)]/);
      if (!regex.test(dep.version)) {
        throw new Error(`invalid toolkit version: ${dep.version}`);
      }
      range = '';
      if (vr[0].charAt(0) === '[') {
        vr[0] = vr[0].slice(1);
        range += `>=${vr[0]}`;
      } else {
        vr[0] = vr[0].slice(1);
        range += `>${vr[0]}`;
      }
      if (vr[1].charAt(vr[1].length - 1) === ')') {
        vr[1] = vr[1].substr(0, vr.length - 1);
        range += ` <${vr[1]}`;
      } else {
        vr[1] = vr[1].slice(0, vr.length - 1);
        range += ` <=${vr[1]}`;
      }
    } else if (vr.length === 1) {
      range = `>=${vr[0]}`;
    } else {
      throw new Error(`invalid toolkit version: ${dep.version}`);
    }
    const parsedDep = { name: dep.name, version: range };
    return parsedDep;
  });
}

function getToolkits(toolkitCacheDir, toolkitPathSetting, appRoot) {
  const allToolkits = StreamsToolkitsUtils.getAllToolkits(toolkitCacheDir, toolkitPathSetting);

  // if info.xml exists, only include toolkits that are dependencies, ensuring they are newer versions than those on the build service
  if (fs.existsSync(`${appRoot}${path.sep}info.xml`)) {
    try {
      const xml = fs.readFileSync(`${appRoot}${path.sep}info.xml`, 'utf8');
      const document = new xmldoc.XmlDocument(xml);
      const dependenciesNode = document.childNamed('info:dependencies');
      if (dependenciesNode) {
        const dependencyToolkitsNodes = dependenciesNode.childrenNamed('info:toolkit');
        if (dependencyToolkitsNodes) {
          const dependencies = dependencyToolkitsNodes.map(node => ({
            name: node.valueWithPath('common:name'),
            version: node.valueWithPath('common:version')
          }));
          const parsedDependencies = parseToolkitVersions(dependencies);
          const newestLocalToolkits = StreamsToolkitsUtils.filterNewestToolkits(allToolkits).filter(tk => tk.isLocal);
          const toolkitsToInclude = _.intersectionWith(newestLocalToolkits, parsedDependencies, (tk, dependency) => tk.name === dependency.name && semver.satisfies(semver.coerce(tk.version), dependency.version));
          return toolkitsToInclude.map(tk => ({ name: tk.name, tkPath: path.dirname(tk.indexPath) }));
        }
      }
    } catch (err) {
      throw new Error(`Error reading toolkit dependencies from ${appRoot}${path.sep}info.xml\n${err}`);
    }
  } else {
    // if there is no info.xml, include all local toolkits, ensuring they are newer versions than those on the build service
    return StreamsToolkitsUtils.filterNewestToolkits(allToolkits).filter(tk => tk.isLocal).map(tk => ({ name: tk.name, tkPath: path.dirname(tk.indexPath) }));
  }
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
  observableBuildSourceArchive,
  checkArchiveDone
};

export default SourceArchiveUtils;
