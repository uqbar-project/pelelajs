export const vscodeStub = {
  Uri: class Uri {
    fsPath: string
    constructor(fsPath: string) {
      this.fsPath = fsPath
    }

    static file(pathStr: string) {
      return new vscodeStub.Uri(pathStr)
    }
  },

  Position: class Position {
    line: number
    character: number
    constructor(line: number, character: number) {
      this.line = line
      this.character = character
    }
  },

  Range: class Range {
    start: unknown
    end: unknown
    constructor(start: unknown, end: unknown) {
      this.start = start
      this.end = end
    }
  },

  Location: class Location {
    uri: unknown
    range: unknown
    constructor(uri: unknown, rangeOrPosition: unknown) {
      this.uri = uri
      if (rangeOrPosition instanceof vscodeStub.Position) {
        this.range = new vscodeStub.Range(rangeOrPosition, rangeOrPosition)
      } else {
        this.range = rangeOrPosition
      }
    }
  },

  CompletionItem: class CompletionItem {
    label: string
    kind: number
    detail: string
    sortText: string
    insertText: unknown
    constructor(label: string, kind: number) {
      this.label = label
      this.kind = kind
      this.detail = ''
      this.sortText = ''
      this.insertText = null
    }
  },

  CompletionItemKind: {
    Text: 0,
    Method: 1,
    Function: 2,
    Constructor: 3,
    Field: 4,
    Variable: 5,
    Class: 6,
    Interface: 7,
    Module: 8,
    Property: 9,
    Unit: 10,
    Value: 11,
    Enum: 12,
    Keyword: 13,
    Snippet: 14,
    Color: 15,
    File: 16,
    Reference: 17,
    Folder: 18,
  },

  Hover: class Hover {
    contents: unknown
    range: unknown
    constructor(contents: unknown, range?: unknown) {
      this.contents = contents
      this.range = range
    }
  },

  SnippetString: class SnippetString {
    value: string
    constructor(value: string) {
      this.value = value
    }
  },

  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },

  Diagnostic: class Diagnostic {
    range: unknown
    message: string
    severity: unknown
    source: string | undefined

    constructor(range: unknown, message: string, severity?: unknown) {
      this.range = range
      this.message = message
      this.severity = severity
    }
  },

  DiagnosticCollection: class DiagnosticCollection {
    _entries: Map<string, unknown[]> = new Map()

    set(uri: unknown, diagnostics: unknown[]): void {
      const key = (uri as { fsPath?: string }).fsPath ?? String(uri)
      if (diagnostics.length === 0) {
        this._entries.delete(key)
      } else {
        this._entries.set(key, diagnostics)
      }
    }

    clear(): void {
      this._entries.clear()
    }

    delete(uri: unknown): void {
      const key = (uri as { fsPath?: string }).fsPath ?? String(uri)
      this._entries.delete(key)
    }

    dispose(): void {
      this._entries.clear()
    }
  },

  languages: {
    registerCompletionItemProvider: () => ({ dispose: () => {} }),
    registerDefinitionProvider: () => ({ dispose: () => {} }),
    setTextDocumentLanguage: () => Promise.resolve(),
    setLanguageConfiguration: () => ({ dispose: () => {} }),
    createDiagnosticCollection: () => new vscodeStub.DiagnosticCollection(),
  },

  Disposable: {
    from: (...disposables: unknown[]) => ({
      dispose: () => {
        disposables.forEach((disposable) => {
          if (disposable && typeof disposable === 'object' && 'dispose' in disposable) {
            ;(disposable as { dispose: () => void }).dispose()
          }
        })
      },
    }),
  },

  workspace: {
    onDidOpenTextDocument: () => ({ dispose: () => {} }),
    onDidChangeTextDocument: () => ({ dispose: () => {} }),
    onDidCloseTextDocument: () => ({ dispose: () => {} }),
    onDidSaveTextDocument: () => ({ dispose: () => {} }),
    findFiles: (_globPattern: string) => Promise.resolve([]),
  },

  env: {
    language: 'es',
  },

  window: {
    activeTextEditor: null,
    onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
  },

  commands: {
    executeCommand: () => Promise.resolve(),
  },
}
