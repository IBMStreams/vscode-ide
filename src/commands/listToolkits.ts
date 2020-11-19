import { Commands, BaseCommand } from '.';
import StreamsBuild from '../build';

/**
 * Command that lists the available toolkits
 */
export default class ListToolkitsCommand implements BaseCommand {
  public commandName: string = Commands.ENVIRONMENT.TOOLKITS_LIST;

  /**
   * Execute the command
   */
  public execute(): any {
    StreamsBuild.listToolkits();
  }
}
