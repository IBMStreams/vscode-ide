'use strict';

import * as path from 'path';
import * as os from 'os';
import * as _ from 'underscore';

import { Trace } from 'vscode-jsonrpc';
import { commands, window, workspace, ConfigurationTarget, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/lib/main';

import { SplBuilder } from './lib/spl-build-common';
import { SplConfig } from './lib/config';
import { SplLinter } from './lib/linter';
import { SplLogger } from './lib/logger';
import { Command } from './lib/commands/command';
import { SetConfigSettingCommand } from './lib/commands/setConfigSetting';
import { SplBuildCommand } from './lib/commands/splBuild';
import { CreateApplicationCommand } from './lib/commands/createApplication';

let client: LanguageClient;

export function activate(context: ExtensionContext): void {
    // Set up language server and client options
    const launcher = os.platform() === 'win32' ? 'startSplLspServer.bat' : 'startSplLspServer';
    const command = os.platform() === 'win32' ? launcher : `./${launcher}`;
    const cwd = context.asAbsolutePath(path.join('node_modules', '@ibmstreams', 'spl-lsp', 'bin'));

    const serverOptions: ServerOptions = {
        run: { command: command, options: { cwd: cwd } },
        debug: { command: command, args: ['-Xdebug', '-Xrunjdwp:transport=dt_socket,address=8998,server=y,suspend=n'], options: { cwd: cwd } }
    };

    const clientOptions: LanguageClientOptions = {
        outputChannelName: 'SPL Language Server',
        documentSelector: [{ scheme: 'file', language: 'spl' }],
        synchronize: {
            fileEvents: workspace.createFileSystemWatcher('**/*.*')
        },
        initializationOptions: () => ({ settings: SplConfig.getCurrentSettings() })
    };

    // Create the language client and start the client
    client = new LanguageClient('SPL', serverOptions, clientOptions);

    // Enable tracing
    client.trace = Trace.Verbose;

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(client.start());

    // Set up output channel for logging
    const outputChannel = window.createOutputChannel('SPL');
    SplLogger.registerOutputPanel(outputChannel);
    context.subscriptions.push(outputChannel);

    // Configure
    SplConfig.configure(context, client);
    SplLinter.configure(context);
    workspace.getConfiguration('workbench').update('colorCustomizations', {
        '[Streams Light]': {
            'editor.selectionBackground': '#E2F5FF',
            'editorBracketMatch.background': '#7D7D7D66',
            'editorCursor.foreground': '#000000'
        },
        '[Streams Dark]': {
            'editor.selectionBackground': '#2F4F4F',
            'editorBracketMatch.background': '#7D7D7D66',
            'editorCursor.foreground': '#FFFFFF'
        }
    }, ConfigurationTarget.Global);

    // Register commands
    const streamsCommands = new Array<Command>();
    streamsCommands.push(new SetConfigSettingCommand('ibm-streams.setServiceCredentials'));
    streamsCommands.push(new SetConfigSettingCommand('ibm-streams.setToolkitsPath'));
    streamsCommands.push(new SplBuildCommand('ibm-streams.build', SplBuilder.BUILD_ACTION.DEFAULT));
    streamsCommands.push(new SplBuildCommand('ibm-streams.buildDownload', SplBuilder.BUILD_ACTION.DOWNLOAD));
    streamsCommands.push(new SplBuildCommand('ibm-streams.buildSubmit', SplBuilder.BUILD_ACTION.SUBMIT));
    streamsCommands.push(new CreateApplicationCommand());

    _.each(streamsCommands, command => {
        context.subscriptions.push(commands.registerCommand(command.commandName, (...args) => {
            command.execute(context, args)
                .catch(error => {
                    SplLogger.error(`An error occurred while executing command: ${command.commandName}`);
                    if (error && error.stack) {
                        SplLogger.error(error.stack);
                    }
                    if (command.commandName.includes('ibm-streams.build')) {
                        SplLogger.error('Build failed', true, true);
                    }
                });
        }));
    });
}

export function deactivate(): Thenable<void> {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
