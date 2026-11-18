import * as path from 'node:path'

interface StubWorkspaceFolder {
  name: string
  uri: { fsPath: string }
}

interface StubUri {
  fsPath: string
}

interface StubMessage {
  kind: 'error' | 'information' | 'warning'
  message: string
}

interface StubCommandInvocation {
  command: string
  args: unknown[]
}

interface StubFileSystemWatcher {
  changeListeners: Array<(uri: StubUri) => void>
  createListeners: Array<(uri: StubUri) => void>
  deleteListeners: Array<(uri: StubUri) => void>
}

interface StubInputBoxOptions {
  prompt?: string
  placeHolder?: string
  value?: string
  validateInput?: (value: string) => string | undefined
}

export class StubOutputChannel {
  name: string
  lines: string[] = []

  constructor(name: string) {
    this.name = name
  }

  append(value: string): void {
    this.lines.push(value)
  }

  appendLine(value: string): void {
    this.lines.push(value)
  }

  show(): void {}

  hide(): void {}

  clear(): void {
    this.lines.length = 0
  }

  replace(): void {}

  dispose(): void {
    this.lines.length = 0
  }
}

let workspaceFolders: StubWorkspaceFolder[] = []
const openTextDocuments: unknown[] = []
let lastCreatedCollection: InstanceType<typeof vscodeStub.DiagnosticCollection> | null = null
let inputBoxResponses: Array<string | undefined> = []
let lastInputBoxOptions: StubInputBoxOptions | undefined
let messages: StubMessage[] = []
let quickPickLabel: string | undefined
let messageResponse: string | undefined
let registeredCommands = new Map<string, (...args: unknown[]) => unknown>()
let lastCreatedOutputChannel: StubOutputChannel | null = null
let shownDocuments: string[] = []
let commandInvocations: StubCommandInvocation[] = []
let settings: Record<string, unknown> = {}
let saveAllResult = true
let openDocumentListeners: Array<(document: unknown) => void> = []
let fileSystemWatchers: StubFileSystemWatcher[] = []
let languageChanges: Array<{ uri: string; languageId: string }> = []

export function setWorkspaceFolders(folders: string[] | null): void {
  workspaceFolders =
    folders === null
      ? []
      : folders.map((fsPath) => ({ name: path.basename(fsPath), uri: { fsPath } }))
}

export function setOpenTextDocuments(documents: unknown[]): void {
  openTextDocuments.length = 0
  openTextDocuments.push(...documents)
}

export function setInputBoxResponses(responses: Array<string | undefined>): void {
  inputBoxResponses = [...responses]
}

export function lastInputBox(): StubInputBoxOptions | undefined {
  return lastInputBoxOptions
}

export function setQuickPickLabel(label: string | undefined): void {
  quickPickLabel = label
}

export function setMessageResponse(response: string | undefined): void {
  messageResponse = response
}

export function setSetting(key: string, value: unknown): void {
  settings[key] = value
}

export function setSaveAllResult(result: boolean): void {
  saveAllResult = result
}

export function setActiveTextEditor(editor: unknown): void {
  vscodeStub.window.activeTextEditor = editor
}

export function getMessages(): StubMessage[] {
  return [...messages]
}

export function getRegisteredCommand(
  commandId: string
): ((...args: unknown[]) => unknown) | undefined {
  return registeredCommands.get(commandId)
}

export function getCommandInvocations(): StubCommandInvocation[] {
  return [...commandInvocations]
}

export function getShownDocuments(): string[] {
  return [...shownDocuments]
}

export function getLanguageChanges(): Array<{ uri: string; languageId: string }> {
  return [...languageChanges]
}

export function getFileSystemWatchers(): StubFileSystemWatcher[] {
  return [...fileSystemWatchers]
}

export function triggerOpenTextDocument(document: unknown): void {
  openDocumentListeners.forEach((listener) => {
    listener(document)
  })
}

export function lastOutputChannel(): StubOutputChannel | null {
  return lastCreatedOutputChannel
}

export function lastDiagnosticCollection(): InstanceType<
  typeof vscodeStub.DiagnosticCollection
> | null {
  return lastCreatedCollection
}

export function resetVscodeStub(): void {
  workspaceFolders = []
  openTextDocuments.length = 0
  lastCreatedCollection = null
  inputBoxResponses = []
  lastInputBoxOptions = undefined
  messages = []
  quickPickLabel = undefined
  messageResponse = undefined
  registeredCommands = new Map()
  lastCreatedOutputChannel = null
  shownDocuments = []
  commandInvocations = []
  settings = {}
  saveAllResult = true
  openDocumentListeners = []
  fileSystemWatchers = []
  languageChanges = []
  vscodeStub.window.activeTextEditor = null
  vscodeStub.env.language = 'es'
}

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
    constructor(
      startOrLine: unknown,
      endOrCharacter: unknown,
      endLine?: unknown,
      endCharacter?: unknown
    ) {
      if (typeof endLine === 'number' && typeof endCharacter === 'number') {
        this.start = new vscodeStub.Position(startOrLine as number, endOrCharacter as number)
        this.end = new vscodeStub.Position(endLine, endCharacter)
      } else {
        this.start = startOrLine
        this.end = endOrCharacter
      }
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

  ProgressLocation: {
    SourceControl: 1,
    Window: 10,
    Notification: 15,
  },

  languages: {
    registerCompletionItemProvider: () => ({ dispose: () => {} }),
    registerDefinitionProvider: () => ({ dispose: () => {} }),
    registerHoverProvider: () => ({ dispose: () => {} }),
    setTextDocumentLanguage: (document: { uri?: { fsPath?: string } }, languageId: string) => {
      languageChanges.push({
        uri: document.uri?.fsPath ?? '',
        languageId,
      })
      return Promise.resolve()
    },
    setLanguageConfiguration: () => ({ dispose: () => {} }),
    createDiagnosticCollection: () => {
      lastCreatedCollection = new vscodeStub.DiagnosticCollection()
      return lastCreatedCollection
    },
  },

  Disposable: class Disposable {
    callback: () => void

    constructor(callback: () => void) {
      this.callback = callback
    }

    dispose(): void {
      this.callback()
    }

    static from(...disposables: unknown[]) {
      return {
        dispose: () => {
          disposables.forEach((disposable) => {
            if (disposable && typeof disposable === 'object' && 'dispose' in disposable) {
              ;(disposable as { dispose: () => void }).dispose()
            }
          })
        },
      }
    }
  },

  workspace: {
    textDocuments: openTextDocuments,
    onDidOpenTextDocument: (listener: (document: unknown) => void) => {
      openDocumentListeners.push(listener)
      return { dispose: () => {} }
    },
    onDidChangeTextDocument: () => ({ dispose: () => {} }),
    onDidCloseTextDocument: () => ({ dispose: () => {} }),
    onDidSaveTextDocument: () => ({ dispose: () => {} }),
    findFiles: (_globPattern: string) => Promise.resolve([]),
    getWorkspaceFolder: (uri: { fsPath: string }) =>
      workspaceFolders.find(
        (folder: StubWorkspaceFolder) =>
          uri.fsPath === folder.uri.fsPath || uri.fsPath.startsWith(folder.uri.fsPath + path.sep)
      ),
    get workspaceFolders() {
      return workspaceFolders
    },
    saveAll: (_includeUntitled?: boolean) => Promise.resolve(saveAllResult),
    getConfiguration: (section: string) => {
      const prefix = section === '' ? '' : `${section}.`
      return {
        get: (key: string, defaultValue?: unknown) => settings[`${prefix}${key}`] ?? defaultValue,
      }
    },
    createFileSystemWatcher: (_globPattern: string) => {
      const watcher: StubFileSystemWatcher = {
        changeListeners: [],
        createListeners: [],
        deleteListeners: [],
      }
      fileSystemWatchers.push(watcher)
      return {
        onDidChange: (listener: (uri: StubUri) => void) => {
          watcher.changeListeners.push(listener)
          return { dispose: () => {} }
        },
        onDidCreate: (listener: (uri: StubUri) => void) => {
          watcher.createListeners.push(listener)
          return { dispose: () => {} }
        },
        onDidDelete: (listener: (uri: StubUri) => void) => {
          watcher.deleteListeners.push(listener)
          return { dispose: () => {} }
        },
        dispose: () => {
          fileSystemWatchers = fileSystemWatchers.filter((entry) => entry !== watcher)
        },
      }
    },
  },

  env: {
    language: 'es',
  },

  window: {
    activeTextEditor: null as unknown,
    onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
    showInputBox: (options: StubInputBoxOptions) => {
      lastInputBoxOptions = options
      return Promise.resolve(inputBoxResponses.shift())
    },
    showQuickPick: (items: unknown) => {
      const candidates = Array.isArray(items) ? items : []
      return Promise.resolve(
        candidates.find((item) => (item as { label?: string }).label === quickPickLabel)
      )
    },
    showErrorMessage: (message: string) => {
      messages.push({ kind: 'error', message })
      return Promise.resolve(messageResponse)
    },
    showInformationMessage: (message: string) => {
      messages.push({ kind: 'information', message })
      return Promise.resolve(messageResponse)
    },
    showWarningMessage: (message: string) => {
      messages.push({ kind: 'warning', message })
      return Promise.resolve(messageResponse)
    },
    withProgress: (_options: unknown, task: (progress: unknown, token: unknown) => unknown) =>
      Promise.resolve(
        task(
          { report: () => {} },
          { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) }
        )
      ),
    createOutputChannel: (name: string) => {
      lastCreatedOutputChannel = new StubOutputChannel(name)
      return lastCreatedOutputChannel
    },
    showTextDocument: (uri: StubUri) => {
      shownDocuments.push(uri.fsPath)
      return Promise.resolve({ uri })
    },
  },

  commands: {
    registerCommand: (commandId: string, callback: (...args: unknown[]) => unknown) => {
      registeredCommands.set(commandId, callback)
      return {
        dispose: () => {
          registeredCommands.delete(commandId)
        },
      }
    },
    executeCommand: (command: string, ...args: unknown[]) => {
      commandInvocations.push({ command, args })
      return Promise.resolve(undefined)
    },
  },
}

export function setLanguage(language: string): void {
  vscodeStub.env.language = language
}
