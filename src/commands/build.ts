import { PrimitiveOperatorType, Registry } from '@ibmstreams/common';
import * as fs from 'fs';
import { ExtensionContext, Uri, window } from 'vscode';
import { Commands, BaseCommand } from '.';
import StreamsBuild from '../build';
import { Settings, Configuration } from '../utils';

/**
 * Command that allows a user to build or submit Streams application(s)
 */
export default class BuildCommand implements BaseCommand {
  private _buildType: number;

  /**
   * Initialize the command
   * @param commandName the name of the command
   * @param buildType the build type
   */
  constructor(public commandName: string, buildType?: number) {
    this._buildType = typeof buildType === 'number' ? buildType : null;
  }

  /**
   * Execute the command
   * @param context the extension context
   * @param args array of arguments
   */
  public execute(context: ExtensionContext, ...args: any[]): Promise<void> {
    let filePaths = null;
    if (args[0] && Array.isArray(args[0][1])) {
      filePaths = args[0][1].map((uri: Uri) => uri.fsPath);
    } else if (window.activeTextEditor) {
      filePaths = [window.activeTextEditor.document.fileName];
    }

    switch (this.commandName) {
      case Commands.BUILD.APP_DOWNLOAD:
      case Commands.BUILD.APP_SUBMIT:
      case Commands.BUILD.APP_IMAGE:
        return StreamsBuild.buildApp(filePaths[0], this._buildType).catch(
          (error) => {
            throw error;
          }
        );
      case Commands.BUILD.OSSTREAMS_BUILD:
        const OSSInput = Configuration.getSetting(Settings.OSS_INPUT);
        const messageHandlerDefault = Registry.getDefaultMessageHandler();
        return StreamsBuild.buildOsstreams(filePaths[0], OSSInput).catch(
          (error) => {
            messageHandlerDefault.logError(`Docker build error: ${error}`);
            throw error;
          }
        );
      case Commands.BUILD.V43_BUILD:
        const V43Image = Configuration.getSetting(Settings.V43_IMAGE_NAME);
        const V43Version = Configuration.getSetting(Settings.V43_VERSION);
        const V43Folder = Configuration.getSetting(Settings.V43_SHARED_FOLDER);
        return StreamsBuild.buildv43(
          V43Image,
          V43Version,
          V43Folder,
          filePaths[0]
        ).catch((error) => {
          throw error;
        });
      case Commands.BUILD.MAKE_DOWNLOAD:
      case Commands.BUILD.MAKE_SUBMIT:
      case Commands.BUILD.MAKE_IMAGE:
        return StreamsBuild.buildMake(filePaths[0], this._buildType).catch(
          (error) => {
            throw error;
          }
        );
      case Commands.BUILD.SUBMIT:
        return StreamsBuild.submit(filePaths).catch((error) => {
          throw error;
        });
      case Commands.BUILD.UPLOAD_APPLICATION_BUNDLE:
        return StreamsBuild.uploadApplicationBundle(filePaths[0]).catch(
          (error) => {
            throw error;
          }
        );
      case Commands.BUILD.IMAGE:
        return StreamsBuild.buildImage(filePaths).catch((error) => {
          throw error;
        });
      case Commands.BUILD.TOOLKIT:
        return StreamsBuild.buildToolkit(filePaths[0]).catch((error) => {
          throw error;
        });
      case Commands.BUILD.CPP_PRIMITIVE_OPERATOR:
        return StreamsBuild.buildPrimitiveOperator(
          PrimitiveOperatorType.Cpp,
          filePaths[0]
        ).catch((error) => {
          throw error;
        });
      case Commands.BUILD.JAVA_PRIMITIVE_OPERATOR:
        return StreamsBuild.buildPrimitiveOperator(
          PrimitiveOperatorType.Java,
          filePaths[0]
        ).catch((error) => {
          throw error;
        });
      case Commands.ENVIRONMENT.ADD_TOOLKIT_TO_BUILD_SERVICE:
        let selected = null;
        if (filePaths && filePaths.length && fs.existsSync(filePaths[0])) {
          selected = filePaths[0];
        }
        return StreamsBuild.addToolkitToBuildService(selected).catch(
          (error) => {
            throw error;
          }
        );
      case Commands.ENVIRONMENT.REMOVE_TOOLKITS_FROM_BUILD_SERVICE:
        return StreamsBuild.removeToolkitsFromBuildService().catch((error) => {
          throw error;
        });
      case Commands.ENVIRONMENT.CANCEL_RUNNING_JOBS:
        return StreamsBuild.cancelActiveRuns().catch((error) => {
          throw error;
        });
      case Commands.ENVIRONMENT.DELETE_CANCELED_JOBS:
        return StreamsBuild.deleteCanceledRuns().catch((error) => {
          throw error;
        });
      default:
        return null;
    }
  }
}
