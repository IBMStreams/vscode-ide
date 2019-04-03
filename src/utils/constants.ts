import * as path from 'path';
import { extensions } from 'vscode';

export class Constants {
    public static readonly EXTENSION_PUBLISHER = 'IBM';
    public static readonly EXTENSION_NAME = 'ibm-streams';
    public static readonly EXTENSION_ID = `${Constants.EXTENSION_PUBLISHER}.${Constants.EXTENSION_NAME}`;
    public static readonly SPL = 'spl';

    public static readonly TOOLKITS_CACHE_DIR = `${extensions.getExtension(Constants.EXTENSION_ID).extensionPath}${path.sep}toolkitsCache`;
}
