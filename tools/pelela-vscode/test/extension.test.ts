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
  lastOutputChannel,
  setActiveTextEditor,
  triggerOpenTextDocument,
} from './vscode-stub'

const PELELA_LANGUAGE_ID = 'pelela'
const SET_CONTEXT_COMMAND = 'setContext'
const ENABLED_CONTEXT = 'pelela.enabled'
const WATCHER_COUNT = 1
const PROVIDER_SUBSCRIPTION_COUNT = 7
const COMMAND_SUBSCRIPTION_COUNT = 5

function createContext(): vscode.ExtensionContext {
  return { subscriptions: [] } as unknown as vscode.ExtensionContext
}

function createDocument(root: string, fileName: string) {
  return { languageId: PELELA_LANGUAGE_ID, uri: { fsPath: join(root, fileName) } }
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

  it('reacts to view model changes', () => {
    const root = createTempRoot()
    activate(createContext())
    const watcher = getFileSystemWatchers()[0]

    watcher.changeListeners.forEach((listener) => {
      listener({ fsPath: join(root, 'nav-bar.ts') })
    })

    assert.equal(watcher.changeListeners.length, 1)
  })

  it('reacts to template changes', () => {
    const root = createTempRoot()
    activate(createContext())
    const watcher = getFileSystemWatchers()[0]

    watcher.changeListeners.forEach((listener) => {
      listener({ fsPath: join(root, 'nav-bar.pelela') })
    })

    assert.equal(watcher.changeListeners.length, 1)
  })

  it('reacts to created and deleted files', () => {
    const root = createTempRoot()
    activate(createContext())
    const watcher = getFileSystemWatchers()[0]

    watcher.createListeners.forEach((listener) => {
      listener({ fsPath: join(root, 'created.pelela') })
    })
    watcher.deleteListeners.forEach((listener) => {
      listener({ fsPath: join(root, 'deleted.pelela') })
    })

    assert.equal(watcher.createListeners.length, 1)
    assert.equal(watcher.deleteListeners.length, 1)
  })
})

describe('deactivate', () => {
  it('has nothing to clean up', () => {
    assert.equal(deactivate(), undefined)
  })
})
