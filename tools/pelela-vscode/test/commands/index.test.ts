import * as assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import type * as vscode from 'vscode'
import { PELELA_COMMANDS, registerPelelaCommands } from '../../src/commands'
import { t } from '../../src/i18n'
import { getMessages, getRegisteredCommand, lastOutputChannel } from '../vscode-stub'

const OUTPUT_CHANNEL_NAME = 'Pelela'
const REGISTERED_COMMAND_COUNT = 5
const COMMAND_IDS = [
  PELELA_COMMANDS.renameComponent,
  PELELA_COMMANDS.moveComponent,
  PELELA_COMMANDS.newComponent,
  PELELA_COMMANDS.addTesting,
]

function createContext(): vscode.ExtensionContext {
  return { subscriptions: [] } as unknown as vscode.ExtensionContext
}

describe('registerPelelaCommands', () => {
  it('exposes the command identifiers used by the manifest', () => {
    assert.deepEqual(COMMAND_IDS, [
      'pelela.renameComponent',
      'pelela.moveComponent',
      'pelela.newComponent',
      'pelela.addTesting',
    ])
  })

  it('creates the output channel and registers every command', () => {
    const context = createContext()

    registerPelelaCommands(context)

    assert.equal(lastOutputChannel()?.name, OUTPUT_CHANNEL_NAME)
    assert.equal(context.subscriptions.length, REGISTERED_COMMAND_COUNT)
    assert.equal(context.subscriptions[0], lastOutputChannel())
    COMMAND_IDS.forEach((commandId) => {
      assert.notEqual(getRegisteredCommand(commandId), undefined)
    })
  })

  it('routes the rename command to the rename handler', async () => {
    registerPelelaCommands(createContext())

    await getRegisteredCommand(PELELA_COMMANDS.renameComponent)?.()

    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.noComponentSelected') },
    ])
  })

  it('routes the move command to the move handler', async () => {
    registerPelelaCommands(createContext())

    await getRegisteredCommand(PELELA_COMMANDS.moveComponent)?.()

    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.noComponentSelected') },
    ])
  })

  it('routes the new component command to the create handler', async () => {
    registerPelelaCommands(createContext())

    await getRegisteredCommand(PELELA_COMMANDS.newComponent)?.()

    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.projectNotFound') },
    ])
  })

  it('routes the add testing command to the testing handler', async () => {
    registerPelelaCommands(createContext())

    await getRegisteredCommand(PELELA_COMMANDS.addTesting)?.()

    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.projectNotFound') },
    ])
  })
})
