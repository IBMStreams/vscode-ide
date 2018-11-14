'use strict';

export interface BaseCommand {
    commandName: string;
    
    /**
     * Execute the command
     * @param args    Array of arguments
     */
    execute(...args: any[]): any;
}
