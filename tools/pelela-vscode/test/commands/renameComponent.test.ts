import * as assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import { renameComponent } from '../../src/commands/renameComponent'
import { t } from '../../src/i18n'
import {
  getMessages,
  getShownDocuments,
  lastInputBox,
  setActiveTextEditor,
  setInputBoxResponses,
  setWorkspaceFolders,
} from '../vscode-stub'
import {
  COMPONENTS_DIRECTORY,
  createPelelaProject,
  createRecordingRunner,
  createThrowingRunner,
  FAILURE_RESULT,
} from './helpers'

const RENAME_ARGUMENT = 'rename'
const NEW_NAME = 'NewName'
const NEW_FILE_NAME = 'new-name.pelela'
const NAV_BAR_COMPONENT_PATH = `${COMPONENTS_DIRECTORY}/NavBar`
const THROWN_MESSAGE = 'spawn failed'

function createWorkspaceProject(viewModelName?: string) {
  const project = createPelelaProject(viewModelName)
  setWorkspaceFolders([project.root])
  return project
}

describe('renameComponent', () => {
  it('reports that no component is selected', async () => {
    const { runCli, calls } = createRecordingRunner()

    await renameComponent(runCli)

    assert.deepEqual(calls, [])
    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.noComponentSelected') },
    ])
  })

  it('uses the active editor when the command has no resource', async () => {
    const project = createWorkspaceProject()
    setActiveTextEditor({ document: { uri: vscode.Uri.file(project.pelelaPath) } })
    setInputBoxResponses([NEW_NAME])
    const { runCli, calls } = createRecordingRunner()

    await renameComponent(runCli)

    assert.deepEqual(calls, [
      {
        args: [RENAME_ARGUMENT, `components/${project.viewModelName}`, NEW_NAME],
        cwd: project.root,
      },
    ])
  })

  it('uses the file name as CLI path while prefilling the view-model name', async () => {
    const project = createWorkspaceProject('DifferentViewModel')
    setInputBoxResponses([NEW_NAME])
    const { runCli, calls } = createRecordingRunner()

    await renameComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.equal(lastInputBox()?.prompt, t('commands.rename.prompt'))
    assert.equal(lastInputBox()?.value, project.viewModelName)
    assert.deepEqual(calls, [
      {
        args: [RENAME_ARGUMENT, NAV_BAR_COMPONENT_PATH, NEW_NAME],
        cwd: project.root,
      },
    ])
    assert.deepEqual(getShownDocuments(), [join(dirname(project.pelelaPath), NEW_FILE_NAME)])
    assert.deepEqual(getMessages(), [
      { kind: 'information', message: t('commands.rename.success', { name: NEW_NAME }) },
    ])
  })

  it('trims the typed name', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([`  ${NEW_NAME}  `])
    const { runCli, calls } = createRecordingRunner()

    await renameComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(calls, [
      {
        args: [RENAME_ARGUMENT, `components/${project.viewModelName}`, NEW_NAME],
        cwd: project.root,
      },
    ])
  })

  it('rejects an empty name in the input box', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([NEW_NAME])
    const { runCli } = createRecordingRunner()

    await renameComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.equal(lastInputBox()?.validateInput?.(''), t('commands.error.emptyName'))
    assert.equal(lastInputBox()?.validateInput?.(NEW_NAME), undefined)
  })

  it('does nothing when the input box is cancelled', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([undefined])
    const { runCli, calls } = createRecordingRunner()

    await renameComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(calls, [])
    assert.deepEqual(getShownDocuments(), [])
    assert.deepEqual(getMessages(), [])
  })

  it('reports a failing CLI without opening a file', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([NEW_NAME])
    const { runCli } = createRecordingRunner(FAILURE_RESULT)

    await renameComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(getShownDocuments(), [])
    assert.deepEqual(getMessages(), [
      {
        kind: 'error',
        message: t('commands.error.cliFailed', {
          command: RENAME_ARGUMENT,
          error: FAILURE_RESULT.stderr,
        }),
      },
    ])
  })

  it('reports a CLI that could not be spawned', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([NEW_NAME])

    await renameComponent(createThrowingRunner(THROWN_MESSAGE), vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(getMessages(), [{ kind: 'error', message: THROWN_MESSAGE }])
  })

  it('reports a resource that is not a component', async () => {
    const project = createWorkspaceProject()
    const missingPath = join(project.root, 'src', COMPONENTS_DIRECTORY, 'ghost.pelela')

    await renameComponent(createRecordingRunner().runCli, vscode.Uri.file(missingPath))

    assert.deepEqual(getMessages(), [
      {
        kind: 'error',
        message: t('commands.error.notAComponent', {
          file: 'ghost.pelela',
          pelelaFile: 'ghost.pelela',
        }),
      },
    ])
    assert.equal(lastInputBox(), undefined)
  })
})
