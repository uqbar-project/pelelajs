import * as assert from 'node:assert/strict'
import { join } from 'node:path'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import { moveComponent } from '../../src/commands/moveComponent'
import { t } from '../../src/i18n'
import {
  getCommandInvocations,
  getMessages,
  lastInputBox,
  setActiveTextEditor,
  setInputBoxResponses,
  setSaveAllResult,
  setWorkspaceFolders,
} from '../vscode-stub'
import {
  COMPONENTS_DIRECTORY,
  createPelelaProject,
  createRecordingRunner,
  createThrowingRunner,
  FAILURE_RESULT,
} from './helpers'

const MOVE_ARGUMENT = 'move'
const REPORTS_DIRECTORY = `${COMPONENTS_DIRECTORY}/reports`
const WINDOWS_DESTINATION = 'components\\reports\\NavBar'
const REVEAL_COMMAND = 'revealInExplorer'
const THROWN_MESSAGE = 'spawn failed'

function createWorkspaceProject() {
  const project = createPelelaProject()
  setWorkspaceFolders([project.root])
  return project
}

function destinationComponentPath(project: { viewModelName: string }): string {
  return `${REPORTS_DIRECTORY}/${project.viewModelName}`
}

describe('moveComponent', () => {
  it('reports that no component is selected', async () => {
    const { runCli, calls } = createRecordingRunner()

    await moveComponent(runCli)

    assert.deepEqual(calls, [])
    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.noComponentSelected') },
    ])
  })

  it('uses the active editor when the command has no resource', async () => {
    const project = createWorkspaceProject()
    setActiveTextEditor({ document: { uri: vscode.Uri.file(project.pelelaPath) } })
    setInputBoxResponses([destinationComponentPath(project)])
    const { runCli, calls } = createRecordingRunner()

    await moveComponent(runCli)

    assert.deepEqual(calls, [
      {
        args: [
          MOVE_ARGUMENT,
          `components/${project.viewModelName}`,
          destinationComponentPath(project),
        ],
        cwd: project.root,
      },
    ])
  })

  it('prefills the current location and moves the component', async () => {
    const project = createWorkspaceProject()
    const destination = destinationComponentPath(project)
    setInputBoxResponses([destination])
    const { runCli, calls } = createRecordingRunner()

    await moveComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.equal(lastInputBox()?.prompt, t('commands.move.prompt'))
    assert.equal(lastInputBox()?.placeHolder, t('commands.move.hint'))
    assert.equal(lastInputBox()?.value, `${COMPONENTS_DIRECTORY}/${project.viewModelName}`)
    assert.deepEqual(calls, [
      {
        args: [MOVE_ARGUMENT, `components/${project.viewModelName}`, destination],
        cwd: project.root,
      },
    ])
    assert.deepEqual(getCommandInvocations(), [
      {
        command: REVEAL_COMMAND,
        args: [
          vscode.Uri.file(join(project.root, 'src', 'components', 'reports', 'nav-bar.pelela')),
        ],
      },
    ])
    assert.deepEqual(getMessages(), [
      { kind: 'information', message: t('commands.move.success', { path: destination }) },
    ])
  })

  it('does not continue when saving workspace changes fails', async () => {
    const project = createWorkspaceProject()
    setSaveAllResult(false)
    const { runCli, calls } = createRecordingRunner()

    await moveComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(calls, [])
    assert.equal(lastInputBox(), undefined)
    assert.deepEqual(getCommandInvocations(), [])
  })

  it('normalizes Windows separators in the destination', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([WINDOWS_DESTINATION])
    const { runCli, calls } = createRecordingRunner()

    await moveComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(calls, [
      {
        args: [
          MOVE_ARGUMENT,
          `components/${project.viewModelName}`,
          destinationComponentPath(project),
        ],
        cwd: project.root,
      },
    ])
  })

  it('does nothing when the input box is cancelled', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([undefined])
    const { runCli, calls } = createRecordingRunner()

    await moveComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(calls, [])
    assert.deepEqual(getCommandInvocations(), [])
    assert.deepEqual(getMessages(), [])
  })

  it('reports a failing CLI without revealing a file', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([destinationComponentPath(project)])
    const { runCli } = createRecordingRunner(FAILURE_RESULT)

    await moveComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(getCommandInvocations(), [])
    assert.deepEqual(getMessages(), [
      {
        kind: 'error',
        message: t('commands.error.cliFailed', {
          command: MOVE_ARGUMENT,
          error: FAILURE_RESULT.stderr,
        }),
      },
    ])
  })

  it('reports a CLI that could not be spawned', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([destinationComponentPath(project)])

    await moveComponent(createThrowingRunner(THROWN_MESSAGE), vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(getMessages(), [{ kind: 'error', message: THROWN_MESSAGE }])
  })
})
