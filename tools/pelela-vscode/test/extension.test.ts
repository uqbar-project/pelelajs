import * as assert from 'node:assert/strict'
import { join } from 'node:path'
import { describe, it } from 'mocha'
import type * as vscode from 'vscode'
import { PELELA_COMMANDS } from '../src/commands'
import { activate, deactivate } from '../src/extension'
import { createTempRoot } from './commands/helpers'
import {
  getCommandInvocations,
  getFileSystemWatchers,
  getLanguageChanges,
  getRegisteredCommand,
  lastDiagnosticCollection,
  lastOutputChannel,
  setActiveTextEditor,
  setOpenTextDocuments,
  triggerOpenTextDocument,
} from './vscode-stub'

const PELELA_LANGUAGE_ID = 'pelela'
const SET_CONTEXT_COMMAND = 'setContext'
const ENABLED_CONTEXT = 'pelela.enabled'
const WATCHER_COUNT = 1
const PROVIDER_SUBSCRIPTION_COUNT = 7
const COMMAND_SUBSCRIPTION_COUNT = 5
const WATCHED_TEMPLATE = 'nav-bar.pelela'
const WATCHED_VIEW_MODEL = 'nav-bar.ts'
const INVALID_TEMPLATE_CONTENT = '<div onclick="handler"></div>'

function createContext(): vscode.ExtensionContext {
  return { subscriptions: [] } as unknown as vscode.ExtensionContext
}

function createDocument(root: string, fileName: string) {
  return { languageId: PELELA_LANGUAGE_ID, uri: { fsPath: join(root, fileName) } }
}

function createDiagnosticDocument(root: string, fileName: string): vscode.TextDocument {
  return {
    languageId: PELELA_LANGUAGE_ID,
    uri: { fsPath: join(root, fileName) },
    lineCount: 1,
    lineAt: () => ({ text: INVALID_TEMPLATE_CONTENT }),
    getText: () => INVALID_TEMPLATE_CONTENT,
  } as unknown as vscode.TextDocument
}

function diagnosticsForDocument(filePath: string): unknown[] | undefined {
  const collection = lastDiagnosticCollection()
  assert.ok(collection)
  return collection._entries.get(filePath)
}

describe('activate', () => {
  it('enables the Pelela context for the manifest', () => {
    activate(createContext())

    assert.deepEqual(getCommandInvocations(), [
      { command: SET_CONTEXT_COMMAND, args: [ENABLED_CONTEXT, true] },
    ])
  })

  it('registers the extension commands and their output channel', () => {
    const context = createContext()

    activate(context)

    assert.equal(
      context.subscriptions.length,
      PROVIDER_SUBSCRIPTION_COUNT + COMMAND_SUBSCRIPTION_COUNT
    )
    assert.equal(context.subscriptions[PROVIDER_SUBSCRIPTION_COUNT], lastOutputChannel())
    assert.notEqual(getRegisteredCommand(PELELA_COMMANDS.renameComponent), undefined)
    assert.notEqual(getRegisteredCommand(PELELA_COMMANDS.moveComponent), undefined)
    assert.notEqual(getRegisteredCommand(PELELA_COMMANDS.newComponent), undefined)
    assert.notEqual(getRegisteredCommand(PELELA_COMMANDS.addTesting), undefined)
  })

  it('switches opened Pelela documents to the Pelela language', () => {
    const root = createTempRoot()
    activate(createContext())

    triggerOpenTextDocument(createDocument(root, 'nav-bar.pelela'))

    assert.deepEqual(getLanguageChanges(), [
      { uri: join(root, 'nav-bar.pelela'), languageId: PELELA_LANGUAGE_ID },
    ])
  })

  it('ignores opened documents of other languages', () => {
    const root = createTempRoot()
    activate(createContext())

    triggerOpenTextDocument({ languageId: 'typescript', uri: { fsPath: join(root, 'app.ts') } })

    assert.deepEqual(getLanguageChanges(), [])
  })

  it('switches an already open Pelela document to the Pelela language', () => {
    const root = createTempRoot()
    setActiveTextEditor({ document: createDocument(root, 'nav-bar.pelela') })

    activate(createContext())

    assert.deepEqual(getLanguageChanges(), [
      { uri: join(root, 'nav-bar.pelela'), languageId: PELELA_LANGUAGE_ID },
    ])
  })

  it('ignores an active document of another language', () => {
    const root = createTempRoot()
    setActiveTextEditor({
      document: { languageId: 'typescript', uri: { fsPath: join(root, 'app.ts') } },
    })

    activate(createContext())

    assert.deepEqual(getLanguageChanges(), [])
  })

  it('registers a single file system watcher', () => {
    activate(createContext())

    assert.equal(getFileSystemWatchers().length, WATCHER_COUNT)
  })

  it('refreshes diagnostics after a view model changes', () => {
    const root = createTempRoot()
    const document = createDiagnosticDocument(root, WATCHED_TEMPLATE)
    setOpenTextDocuments([document])
    activate(createContext())
    const watcher = getFileSystemWatchers()[0]

    assert.equal(diagnosticsForDocument(document.uri.fsPath), undefined)
    watcher.changeListeners.forEach((listener) => {
      listener({ fsPath: join(root, WATCHED_VIEW_MODEL) })
    })

    assert.equal(diagnosticsForDocument(document.uri.fsPath)?.length, 1)
  })

  it('refreshes diagnostics after a template changes', () => {
    const root = createTempRoot()
    const document = createDiagnosticDocument(root, WATCHED_TEMPLATE)
    setOpenTextDocuments([document])
    activate(createContext())
    const watcher = getFileSystemWatchers()[0]

    assert.equal(diagnosticsForDocument(document.uri.fsPath), undefined)
    watcher.changeListeners.forEach((listener) => {
      listener({ fsPath: join(root, WATCHED_TEMPLATE) })
    })

    assert.equal(diagnosticsForDocument(document.uri.fsPath)?.length, 1)
  })

  it('refreshes diagnostics after a template is created', () => {
    const root = createTempRoot()
    const document = createDiagnosticDocument(root, WATCHED_TEMPLATE)
    setOpenTextDocuments([document])
    activate(createContext())
    const watcher = getFileSystemWatchers()[0]

    assert.equal(diagnosticsForDocument(document.uri.fsPath), undefined)
    watcher.createListeners.forEach((listener) => {
      listener({ fsPath: join(root, WATCHED_TEMPLATE) })
    })

    assert.equal(diagnosticsForDocument(document.uri.fsPath)?.length, 1)
  })

  it('refreshes diagnostics after a template is deleted', () => {
    const root = createTempRoot()
    const document = createDiagnosticDocument(root, WATCHED_TEMPLATE)
    setOpenTextDocuments([document])
    activate(createContext())
    const watcher = getFileSystemWatchers()[0]

    assert.equal(diagnosticsForDocument(document.uri.fsPath), undefined)
    watcher.deleteListeners.forEach((listener) => {
      listener({ fsPath: join(root, WATCHED_TEMPLATE) })
    })

    assert.equal(diagnosticsForDocument(document.uri.fsPath)?.length, 1)
  })
})

describe('deactivate', () => {
  it('has nothing to clean up', () => {
    assert.equal(deactivate(), undefined)
  })
})
