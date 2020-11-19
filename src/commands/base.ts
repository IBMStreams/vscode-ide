/**
 * The base command
 */
export default interface BaseCommand {
  commandName: string;

  /**
   * Execute the command
   * @param args array of arguments
   */
  execute(...args: any[]): any;
}
