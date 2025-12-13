const vscodeStub = {
  Uri: class Uri {
    constructor(fsPath) {
      this.fsPath = fsPath
    }

    static file(pathStr) {
      return new vscodeStub.Uri(pathStr)
    }
  },

  Position: class Position {
    constructor(line, character) {
      this.line = line
      this.character = character
    }
  },

  Range: class Range {
    constructor(start, end) {
      this.start = start
      this.end = end
    }
  },

  Location: class Location {
    constructor(uri, rangeOrPosition) {
      this.uri = uri
      if (rangeOrPosition instanceof vscodeStub.Position) {
        this.range = new vscodeStub.Range(rangeOrPosition, rangeOrPosition)
      } else {
        this.range = rangeOrPosition
      }
    }
  },

  CompletionItem: class CompletionItem {
    constructor(label, kind) {
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
    constructor(value) {
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

module.exports = vscodeStub
