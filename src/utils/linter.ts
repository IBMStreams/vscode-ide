'use strict';

import * as _ from 'underscore';

import { languages, workspace, Diagnostic, DiagnosticCollection, DiagnosticSeverity, ExtensionContext, Range, Uri } from 'vscode';

export class SplLinter {
    private static _diagnosticCollection: DiagnosticCollection;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this._diagnosticCollection = languages.createDiagnosticCollection('spl');
        context.subscriptions.push(this._diagnosticCollection);

        // If diagnostics exist for a file, delete them when the user starts typing
        context.subscriptions.push(workspace.onDidChangeTextDocument(event => {
            if (event.contentChanges.length) {
                const uri = event.document.uri;
                if (this._diagnosticCollection.get(uri)) {
                    this._diagnosticCollection.delete(uri);
                }
            }
        }));
    }

    /**
     * Lint source file(s)
     * @param regExp      The regular expression to use for matching
     * @param appRoot     The application root path
     * @param messages    The build messages to use for matching
     */
    public static lintFiles(regExp: RegExp, appRoot: string, messages: Array<string>): void {
        const diagnosticMap = new Map<Uri, Diagnostic[]>();

        const messageObjs = this.parseMessages(regExp, messages);
        _.each(messageObjs, (obj: any) => {
            const document = _.find(workspace.textDocuments, doc => {
                return doc.fileName.includes(obj.path);
            });
            let diagnostics = [];
            if (document) {
                if (!_.some(Array.from(diagnosticMap.keys()), uri => uri.fsPath === document.uri.fsPath)) {
                    diagnosticMap.set(document.uri, diagnostics);
                } else {
                    diagnostics = diagnosticMap.get(document.uri);
                }

                let severity = null;
                switch(obj.type) {
                    case 'ERROR':
                        severity = DiagnosticSeverity.Error;
                        break;
                    case 'WARN':
                        severity = DiagnosticSeverity.Warning;
                        break;
                    case 'INFO':
                        severity = DiagnosticSeverity.Information;
                        break;
                }

                const diagnostic: Diagnostic = {
                    severity: severity,
                    range: new Range(obj.line - 1, obj.column - 1, obj.line - 1, obj.column - 1),
                    message: `${obj.code} ${obj.message}`,
                    source: 'IBM Streams'
                };
                diagnostics.push(diagnostic);
            }
        });

        for (var uri of diagnosticMap.keys()) {
            this._diagnosticCollection.delete(uri);
            this._diagnosticCollection.set(uri, diagnosticMap.get(uri));
        }
    }

    /**
     * Parse build messages for relevant information
     * @param regExp      The regular expression to use for matching
     * @param messages    The build messages to use for matching
     */
    private static parseMessages(regExp: RegExp, messages: Array<string>): Array<object> {
        let match = null;
        let messageObjs = [];
        _.each(messages, message => {
            match = regExp.exec(message);
            if (match) {
                messageObjs.push({
                    path: match[1],
                    line: parseInt(match[2]),
                    column: parseInt(match[3]),
                    code: match[4],
                    message: match[5],
                    type: match[6]
                });
            }
        });
        return messageObjs;
    }
}

export class LintHandler {
    private	_msgRegex = null;
    private _appRoot = null;

    /**
     * @param msgRegex    The regular expression to use for matching
     * @param appRoot     The application root path
     */
    constructor(msgRegex: RegExp, appRoot: string) {
        this._msgRegex = msgRegex;
        this._appRoot = appRoot;
    }

    /**
     * Parse a build response and lint source file(s)
     * @param response    The build response
     */
    public lint(response: any): void {
        if (!response) {
            return;
        }

        if (response.output && Array.isArray(response.output)) {
            const messages = response.output
                .map(message => message.message_text)
                .filter(message => message.match(this._msgRegex));

            SplLinter.lintFiles(this._msgRegex, this._appRoot, messages);
        }
    }
}
