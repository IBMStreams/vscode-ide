/**
 * The base command
 */
export default interface BaseCommand {
    commandName: string;

    /**
     * Execute the command
     * @param args    Array of arguments
     */
    execute(...args: any[]): any;
}
