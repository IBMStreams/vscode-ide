'use strict';

import * as _ from 'lodash';
import * as path from 'path';
import { Diagnostic, DiagnosticChangeEvent, DiagnosticCollection, DiagnosticSeverity, ExtensionContext, languages, Range, TextDocument, TextDocumentChangeEvent, TextEditor, TextEditorDecorationType, Uri, window, workspace } from 'vscode';
import { Constants } from '.';

/**
 * Manages diagnostics for code errors
 */
export default class Diagnostics {
    private static diagnosticCollection: DiagnosticCollection;
    private static activeEditor: TextEditor;
    private static errorDecorationType: TextEditorDecorationType;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this.diagnosticCollection = languages.createDiagnosticCollection('spl');
        context.subscriptions.push(this.diagnosticCollection);

        this.handleEditorDecorations(context);

        // If diagnostics exist for a file, delete them when the user starts typing
        context.subscriptions.push(workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
            if (event.contentChanges.length) {
                const uri = event.document.uri;
                if (this.diagnosticCollection.get(uri)) {
                    this.diagnosticCollection.delete(uri);
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
    public static lintFiles(regExp: RegExp, appRoot: string, messages: string[]): void {
        const diagnosticMap = new Map<Uri, Diagnostic[]>();

        const messageObjs = this.parseMessages(regExp, messages);
        _.each(messageObjs, (obj: any) => {
            const document = _.find(workspace.textDocuments, (doc: TextDocument) => {
                return doc.fileName === `${appRoot}${path.sep}${obj.path}`;
            });
            if (document) {
                let diagnostics = [];
                if (!_.some(Array.from(diagnosticMap.keys()), (uri: Uri) => uri.fsPath === document.uri.fsPath)) {
                    diagnosticMap.set(document.uri, diagnostics);
                } else {
                    diagnostics = diagnosticMap.get(document.uri);
                }

                let severity = null;
                switch (obj.type) {
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
                    severity,
                    range: new Range(obj.line - 1, obj.column - 1, obj.line - 1, obj.column - 1),
                    message: `${obj.code} ${obj.message}`,
                    source: Constants.IBM_STREAMS
                };
                diagnostics.push(diagnostic);
            }
        });

        for (const uri of diagnosticMap.keys()) {
            this.diagnosticCollection.delete(uri);
            this.diagnosticCollection.set(uri, diagnosticMap.get(uri));
        }
    }

    /**
     * Parse build messages for relevant information
     * @param regExp      The regular expression to use for matching
     * @param messages    The build messages to use for matching
     */
    private static parseMessages(regExp: RegExp, messages: string[]): object[] {
        let match = null;
        const messageObjs = [];
        _.each(messages, (message: string) => {
            match = regExp.exec(message);
            if (match) {
                messageObjs.push({
                    path: match[1],
                    line: parseInt(match[2], 10),
                    column: parseInt(match[3], 10),
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
        this.activeEditor = window.activeTextEditor;

        const createDecoration = (iconPathLight: string, iconPathDark: string) => window.createTextEditorDecorationType({
            light: {
                gutterIconPath: iconPathLight
            },
            dark: {
                gutterIconPath: iconPathDark
            }
        });
        this.errorDecorationType = createDecoration(context.asAbsolutePath('images/markers/error-light.svg'), context.asAbsolutePath('images/markers/error-dark.svg'));

        const isSplFile = () => this.activeEditor && this.activeEditor.document.languageId === 'spl';

        if (isSplFile()) {
            this.updateDecorations();
        }

        context.subscriptions.push(window.onDidChangeActiveTextEditor((editor: TextEditor) => {
            this.activeEditor = editor;
            if (isSplFile()) {
                this.updateDecorations();
            }
        }));

        context.subscriptions.push(workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
            if (isSplFile() && event.document === this.activeEditor.document) {
                this.updateDecorations();
            }
        }));

        context.subscriptions.push(languages.onDidChangeDiagnostics((event: DiagnosticChangeEvent) => {
            if (isSplFile()) {
                const uri = this.activeEditor.document.uri;
                const eventUris = event.uris;
                if (eventUris.length) {
                    const eventUriFsPaths = eventUris.map((eventUri: Uri) => eventUri.fsPath);
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
        if (!this.activeEditor) {
            return;
        }

        const uri = this.activeEditor.document.uri;
        const diagnostics = languages.getDiagnostics(uri);

        const getDiagnosticRanges = (severity: DiagnosticSeverity) => diagnostics
            .filter((diagnostic: Diagnostic) => diagnostic.severity === severity)
            .map((diagnostic: Diagnostic) => diagnostic.range);

        this.activeEditor.setDecorations(this.errorDecorationType, getDiagnosticRanges(DiagnosticSeverity.Error));
    }
}
