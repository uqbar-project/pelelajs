import * as assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  activeTextEditorUri,
  joinComponentPath,
  openFile,
  revealFile,
  validateComponentName,
} from '../../src/commands/ui'
import { t } from '../../src/i18n'
import { getCommandInvocations, getShownDocuments, setActiveTextEditor } from '../vscode-stub'
import { createTempRoot } from './helpers'

const REVEAL_COMMAND = 'revealInExplorer'
const FILE_NAME = 'nav-bar.pelela'

describe('activeTextEditorUri', () => {
  it('returns the uri of the active editor document', () => {
    const root = createTempRoot()
    const uri = vscode.Uri.file(root)
    setActiveTextEditor({ document: { uri } })

    assert.equal(activeTextEditorUri(), uri)
  })

  it('returns undefined without an active editor', () => {
    assert.equal(activeTextEditorUri(), undefined)
  })
})

describe('validateComponentName', () => {
  it('rejects an empty name', () => {
    assert.equal(validateComponentName(''), t('commands.error.emptyName'))
  })

  it('rejects a whitespace-only name', () => {
    assert.equal(validateComponentName('   '), t('commands.error.emptyName'))
  })

  it('accepts a name with content', () => {
    assert.equal(validateComponentName('App'), undefined)
  })
})

describe('openFile', () => {
  it('opens the file in the editor', async () => {
    const root = createTempRoot()
    const filePath = `${root}/src/${FILE_NAME}`

    await openFile(filePath)

    assert.deepEqual(getShownDocuments(), [filePath])
  })
})

describe('revealFile', () => {
  it('reveals the file in the explorer', async () => {
    const root = createTempRoot()
    const filePath = `${root}/src/${FILE_NAME}`

    await revealFile(filePath)

    assert.deepEqual(getCommandInvocations(), [
      { command: REVEAL_COMMAND, args: [vscode.Uri.file(filePath)] },
    ])
  })
})

describe('joinComponentPath', () => {
  it('returns the name when the folder is empty', () => {
    assert.equal(joinComponentPath('', 'NavBar'), 'NavBar')
  })

  it('joins a nested folder with forward slashes', () => {
    assert.equal(joinComponentPath('components/reports', 'NavBar'), 'components/reports/NavBar')
  })
})
