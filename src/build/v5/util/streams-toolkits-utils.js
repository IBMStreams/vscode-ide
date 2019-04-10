import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import * as xmldoc from 'xmldoc';
import StateSelector from './state-selectors';

function refreshLspToolkits(state, sendNotification) {
  const clearParam = getLangServerParamForClearToolkits();
  sendNotification(clearParam);

  const addParam = getLangServerParamForAddToolkits([
    ...getCachedToolkitIndexPaths(StateSelector.getToolkitsCacheDir(state)),
    ...getLocalToolkitIndexPaths(StateSelector.getToolkitsPathSetting(state))
  ]);
  sendNotification(addParam);
}

function getLangServerOptionForInitToolkits(toolkitsCacheDir, toolkitsPathSetting) {
  return {
    toolkits: {
      action: 'INIT',
      indexList: [
        ...getCachedToolkitIndexPaths(toolkitsCacheDir),
        ...getLocalToolkitIndexPaths(toolkitsPathSetting)
      ]
    }
  };
}

function getLangServerParamForAddToolkits(toolkitIndexPaths) {
  return {
    settings: {
      toolkits: {
        action: 'ADD',
        indexList: toolkitIndexPaths
      }
    }
  };
}

function getLangServerParamForRemoveToolkits(toolkitNames) {
  return {
    settings: {
      toolkits: {
        action: 'REMOVE',
        names: toolkitNames
      }
    }
  };
}

function getLangServerParamForClearToolkits() {
  return {
    settings: {
      toolkits: {
        action: 'CLEAR'
      }
    }
  };
}

function getCachedToolkitIndexPaths(toolkitsCacheDir) {
  try {
    const filenames = fs.readdirSync(toolkitsCacheDir).filter(entry => typeof entry === 'string' && path.extname(entry) === '.xml');
    return filenames.map(filename => `${toolkitsCacheDir}${path.sep}${filename}`);
  } catch (err) {
    throw new Error(`Error getting cached toolkit index paths in: ${toolkitsCacheDir}\n${err}`);
  }
}

function getLocalToolkitIndexPaths(toolkitPaths) {
  try {
    const validToolkitIndexPaths = [];
    if (toolkitPaths && toolkitPaths !== '') {
      const toolkitRoots = [];

      if (toolkitPaths.includes(',') || toolkitPaths.includes(';')) {
        toolkitRoots.push(...toolkitPaths.split(/[,;]/));
      } else {
        toolkitRoots.push(toolkitPaths);
      }

      toolkitRoots.forEach(toolkitRoot => {
        if (fs.existsSync(toolkitRoot)) {
          const toolkitRootContents = fs.readdirSync(toolkitRoot);
          validToolkitIndexPaths.push(...toolkitRootContents
            .filter(item => fs.lstatSync(`${toolkitRoot}${path.sep}${item}`).isDirectory())
            .filter(dir => fs.readdirSync(`${toolkitRoot}${path.sep}${dir}`).filter(tkDirItem => tkDirItem === 'toolkit.xml').length > 0)
            .map(toolkit => `${toolkitRoot}${path.sep}${toolkit}${path.sep}toolkit.xml`));
        }
      });
    }
    return validToolkitIndexPaths;
  } catch (err) {
    throw new Error(`Error getting local toolkit index paths for: ${toolkitPaths}\n${err}`);
  }
}

function getChangedLocalToolkits(oldValue, newValue) {
  const oldIndexPaths = getLocalToolkitIndexPaths(oldValue);
  const newIndexPaths = getLocalToolkitIndexPaths(newValue);
  const addedToolkitPaths = _.difference(newIndexPaths, oldIndexPaths);
  const removedToolkitPaths = _.difference(oldIndexPaths, newIndexPaths);
  const removedToolkitNames = [];
  removedToolkitPaths.forEach(tkPath => {
    try {
      const xml = fs.readFileSync(tkPath, 'utf8');
      const document = new xmldoc.XmlDocument(xml);
      const toolkitName = document.childNamed('toolkit').attr.name;
      removedToolkitNames.push(toolkitName);
    } catch (err) {
      throw new Error(`Error reading local toolkit index contents for: ${tkPath}\n${err}`);
    }
  });

  return { addedToolkitPaths, removedToolkitNames };
}

function getToolkitsToCache(state, buildServiceToolkits) {
  const cacheDir = StateSelector.getToolkitsCacheDir(state);
  if (!cacheDir) {
    throw new Error('Toolkit cache directory does not exist');
  }

  const toolkitsToCache = [];
  try {
    const cachedToolkits = fs.readdirSync(cacheDir).filter(entry => typeof entry === 'string' && path.extname(entry) === '.xml');

    buildServiceToolkits.forEach(toolkitObj => {
      const { name, version } = toolkitObj;
      let existingToolkit = cachedToolkits.filter(filename => filename.startsWith(name));
      if (existingToolkit && existingToolkit.length) {
        existingToolkit = existingToolkit[0];
        const existingToolkitVersion = existingToolkit.replace(name, '').match(/-([0-9.]+).xml/)[1];
        if (version > existingToolkitVersion) {
          // Replace the older version with the newer version
          fs.unlinkSync(`${cacheDir}${path.sep}${existingToolkit}`);
          toolkitsToCache.push(toolkitObj);
        }
      } else {
        // Cache the new toolkit index
        toolkitsToCache.push(toolkitObj);
      }
    });
  } catch (err) {
    throw new Error(`Error getting toolkits to cache:\n${err}`);
  }

  return toolkitsToCache;
}

function cacheToolkitIndex(state, toolkit, index) {
  const { name, version } = toolkit;
  const cacheDir = StateSelector.getToolkitsCacheDir(state);
  if (!cacheDir) {
    throw new Error('Toolkit cache directory does not exist');
  }
  try {
    fs.writeFileSync(`${cacheDir}${path.sep}${name}-${version}.xml`, index);
  } catch (err) {
    throw new Error(`Error caching toolkit index for: ${name}\n${err}`);
  }
}

function getLocalToolkits(pathStr) {
  let localToolkits = [];
  const localToolkitIndexPaths = getLocalToolkitIndexPaths(pathStr);
  localToolkits = localToolkitIndexPaths.map(tkPath => {
    const xml = fs.readFileSync(tkPath, 'utf8');
    const document = new xmldoc.XmlDocument(xml);
    const tkName = document.childNamed('toolkit').attr.name;
    const tkVersion = document.childNamed('toolkit').attr.version;
    return `${tkName} - ${tkVersion}`;
  });
  return localToolkits;
}

function getCachedToolkits(cachePath) {
  let cachedToolkits = [];
  if (fs.existsSync(cachePath)) {
    const cachedToolkitIndexPaths = getCachedToolkitIndexPaths(cachePath);
    cachedToolkits = cachedToolkitIndexPaths.map(tkPath => {
      const xml = fs.readFileSync(tkPath, 'utf8');
      const document = new xmldoc.XmlDocument(xml);
      const tkName = document.childNamed('toolkit').attr.name;
      const tkVersion = document.childNamed('toolkit').attr.version;
      return `${tkName} - ${tkVersion}`;
    });
  }
  return cachedToolkits;
}

const StreamsToolkitsUtils = {
  refreshLspToolkits,
  getLangServerOptionForInitToolkits,
  getLangServerParamForAddToolkits,
  getLangServerParamForRemoveToolkits,
  getLangServerParamForClearToolkits,
  getCachedToolkitIndexPaths,
  getLocalToolkitIndexPaths,
  getChangedLocalToolkits,
  cacheToolkitIndex,
  getToolkitsToCache,
  getLocalToolkits,
  getCachedToolkits
};

export default StreamsToolkitsUtils;
