import _each from 'lodash/each';
import _find from 'lodash/find';
import _some from 'lodash/some';
import {
    Diagnostic, DiagnosticChangeEvent, DiagnosticCollection, DiagnosticSeverity, ExtensionContext, languages, Range, TextDocument, TextDocumentChangeEvent, TextEditor, TextEditorDecorationType, Uri, window, workspace
} from 'vscode';
import { EXTENSION_NAME, LANGUAGE_SPL } from '.';

/**
 * Manages diagnostics for code errors
 */
export default class Diagnostics {
    private static diagnosticCollection: DiagnosticCollection;
    private static activeEditor: TextEditor;
    private static errorDecorationType: TextEditorDecorationType;
    private static warningDecorationType: TextEditorDecorationType;
    private static informationDecorationType: TextEditorDecorationType;

    /**
     * Perform initial configuration
     * @param context    The extension context
     */
    public static configure(context: ExtensionContext): void {
        this.diagnosticCollection = languages.createDiagnosticCollection(LANGUAGE_SPL);
        context.subscriptions.push(this.diagnosticCollection);

        this.handleEditorDecorations(context);

        // If diagnostics exist for a file, delete them when the user starts typing
        context.subscriptions.push(workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
            if (event.contentChanges.length) {
                const { uri } = event.document;
                if (this.diagnosticCollection.get(uri)) {
                    this.diagnosticCollection.delete(uri);
                }
            }
        }));
    }

    /**
     * Lint source file(s)
     * @param messages    The build messages to use for matching
     */
    public static lintFiles(messages: string[]): void {
        const diagnosticMap = new Map<Uri, Diagnostic[]>();

        _each(messages, (message: any) => {
            const document = _find(workspace.textDocuments, (doc: TextDocument) => doc.fileName === message.file);
            if (document) {
                let diagnostics = [];
                if (!_some(Array.from(diagnosticMap.keys()), (uri: Uri) => uri.fsPath === document.uri.fsPath)) {
                    diagnosticMap.set(document.uri, diagnostics);
                } else {
                    diagnostics = diagnosticMap.get(document.uri);
                }

                const charIndex = message.column ? message.column - 1 : 0;
                const diagnostic: Diagnostic = {
                    severity: message.severity,
                    range: new Range(message.line - 1, charIndex, message.line - 1, charIndex),
                    message: `${message.code} ${message.description}`,
                    source: EXTENSION_NAME
                };
                diagnostics.push(diagnostic);
            }
        });

        diagnosticMap.forEach((diagnostics, uri) => {
            this.diagnosticCollection.delete(uri);
            this.diagnosticCollection.set(uri, diagnosticMap.get(uri));
        });
    }

    /**
     * Show markers in the editor gutter for error, info, and warning diagnostics
     * @param context    The extension context
     */
    private static handleEditorDecorations(context: ExtensionContext): void {
        this.activeEditor = window.activeTextEditor;

        const createDecoration = (iconPathLight: string, iconPathDark: string): TextEditorDecorationType => window.createTextEditorDecorationType({
            light: { gutterIconPath: iconPathLight },
            dark: { gutterIconPath: iconPathDark }
        });
        this.errorDecorationType = createDecoration(context.asAbsolutePath('images/markers/error-light.svg'), context.asAbsolutePath('images/markers/error-dark.svg'));
        this.warningDecorationType = createDecoration(context.asAbsolutePath('images/markers/warning-light.svg'), context.asAbsolutePath('images/markers/warning-dark.svg'));
        this.informationDecorationType = createDecoration(context.asAbsolutePath('images/markers/information-light.svg'), context.asAbsolutePath('images/markers/information-dark.svg'));


        const isSplFile = (): boolean => this.activeEditor && this.activeEditor.document.languageId === LANGUAGE_SPL;

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
                const { uri } = this.activeEditor.document;
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
    private static updateDecorations(): void {
        if (!this.activeEditor) {
            return;
        }

        const { uri } = this.activeEditor.document;
        const diagnostics = languages.getDiagnostics(uri);

        const getDiagnosticRanges = (severity: DiagnosticSeverity): Range[] => diagnostics
            .filter((diagnostic: Diagnostic) => diagnostic.severity === severity)
            .map((diagnostic: Diagnostic) => diagnostic.range);

        this.activeEditor.setDecorations(this.errorDecorationType, getDiagnosticRanges(DiagnosticSeverity.Error));
        this.activeEditor.setDecorations(this.warningDecorationType, getDiagnosticRanges(DiagnosticSeverity.Warning));
        this.activeEditor.setDecorations(this.informationDecorationType, getDiagnosticRanges(DiagnosticSeverity.Information));
    }
}
