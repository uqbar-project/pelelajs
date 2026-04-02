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
    insertText: any
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

  SnippetString: class SnippetString {
    value: string
    constructor(value: string) {
      this.value = value
    }
  },

  languages: {
    registerCompletionItemProvider: () => ({ dispose: () => {} }),
    registerDefinitionProvider: () => ({ dispose: () => {} }),
    setTextDocumentLanguage: () => Promise.resolve(),
    setLanguageConfiguration: () => ({ dispose: () => {} }),
  },

  workspace: {
    onDidOpenTextDocument: () => ({ dispose: () => {} }),
  },

  window: {
    activeTextEditor: null,
  },

  commands: {
    executeCommand: () => Promise.resolve(),
  },
}
