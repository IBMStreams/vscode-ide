import * as path from 'path';
import { extensions } from 'vscode';

export const EXTENSION_PUBLISHER = 'IBM';
export const EXTENSION_NAME = 'ibm-streams';
export const EXTENSION_ID = `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
export const IBM_STREAMS = 'IBM Streams';
export const TOOLKITS_CACHE_DIR = `${extensions.getExtension(EXTENSION_ID).extensionPath}${path.sep}toolkitsCache`;
