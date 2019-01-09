'use strict';

import * as _ from 'underscore';

import { languages, window, workspace, Diagnostic, DiagnosticChangeEvent, DiagnosticCollection, DiagnosticSeverity, ExtensionContext, Range, TextDocument, TextDocumentChangeEvent, TextEditor, TextEditorDecorationType, Uri } from 'vscode';

export class SplLinter {
    private static _diagnosticCollection: DiagnosticCollection;
    private static _activeEditor: TextEditor;
    private static _errorDecorationType: TextEditorDecorationType;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this._diagnosticCollection = languages.createDiagnosticCollection('spl');
        context.subscriptions.push(this._diagnosticCollection);

        this.handleEditorDecorations(context);

        // If diagnostics exist for a file, delete them when the user starts typing
        context.subscriptions.push(workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
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
            const document = _.find(workspace.textDocuments, (doc: TextDocument) => {
                return doc.fileName.includes(obj.path);
            });
            let diagnostics = [];
            if (document) {
                if (!_.some(Array.from(diagnosticMap.keys()), (uri: Uri) => uri.fsPath === document.uri.fsPath)) {
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
        _.each(messages, (message: string) => {
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

    /**
     * Show markers in the editor gutter for error, info, and warning diagnostics
     * @param context    The extension context
     */
    private static handleEditorDecorations(context: ExtensionContext) {
        this._activeEditor = window.activeTextEditor;

        const createDecoration = (iconPathLight: string, iconPathDark: string) => window.createTextEditorDecorationType({
            light: {
                gutterIconPath: iconPathLight
            },
            dark: {
                gutterIconPath: iconPathDark
            }
        });
        this._errorDecorationType = createDecoration(context.asAbsolutePath('images/markers/error-light.svg'), context.asAbsolutePath('images/markers/error-dark.svg'));

        const isSplFile = (editor: TextEditor) => editor.document.languageId === 'spl';

        if (this._activeEditor && isSplFile(this._activeEditor)) {
            this.updateDecorations();
        }

        context.subscriptions.push(window.onDidChangeActiveTextEditor((editor: TextEditor) => {
            this._activeEditor = editor;
            if (this._activeEditor) {
                this.updateDecorations();
            }
        }));

        context.subscriptions.push(workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
            if (this._activeEditor && event.document === this._activeEditor.document) {
                this.updateDecorations();
            }
        }));

        context.subscriptions.push(languages.onDidChangeDiagnostics((event: DiagnosticChangeEvent) => {
            if (this._activeEditor) {
                const uri = this._activeEditor.document.uri;
                const eventUris = event.uris;
                if (eventUris.length) {
                    const eventUriFsPaths = eventUris.map(uri => uri.fsPath);
                    if (eventUriFsPaths.indexOf(uri.fsPath) > -1) {
                        this.updateDecorations();
                    }
                }
            }
        }));
    }

    /**
     * Set decorations in the active text editor
     */
    private static updateDecorations() {
        if (!this._activeEditor) {
            return;
        }

        const uri = this._activeEditor.document.uri;
        const diagnostics = languages.getDiagnostics(uri);

        const getDiagnosticRanges = (severity: DiagnosticSeverity) => diagnostics
            .filter((diagnostic: Diagnostic) => diagnostic.severity === severity)
            .map((diagnostic: Diagnostic) => diagnostic.range);

        this._activeEditor.setDecorations(this._errorDecorationType, getDiagnosticRanges(DiagnosticSeverity.Error));
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
                .map((message: any) => message.message_text)
                .filter((message: string) => message.match(this._msgRegex));

            SplLinter.lintFiles(this._msgRegex, this._appRoot, messages);
        }
    }
}
