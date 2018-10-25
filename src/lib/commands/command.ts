'use strict';

export interface Command {
    commandName: string;
    
    /**
     * Execute the command
     * @param args    Array of arguments
     */
    execute(...args: any[]): any;
}
