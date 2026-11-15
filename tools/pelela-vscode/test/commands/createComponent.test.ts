import * as assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import { createComponent } from '../../src/commands/createComponent'
import { t } from '../../src/i18n'
import {
  getCommandInvocations,
  getMessages,
  getShownDocuments,
  lastInputBox,
  setInputBoxResponses,
  setQuickPickLabel,
  setWorkspaceFolders,
} from '../vscode-stub'
import {
  COMPONENTS_DIRECTORY,
  createPelelaProject,
  createRecordingRunner,
  createTempRoot,
  createThrowingRunner,
  FAILURE_RESULT,
  NAV_BAR_DIRECTORY,
  SRC_DIRECTORY,
} from './helpers'

const NEW_ARGUMENT = 'new'
const NEW_COMPONENT_NAME = 'App'
const REVEAL_COMMAND = 'revealInExplorer'
const THROWN_MESSAGE = 'spawn failed'

function createWorkspaceProject() {
  const project = createPelelaProject()
  setWorkspaceFolders([project.root])
  return project
}

function expectedComponentPath(root: string, folderPath: string): string {
  return join(root, SRC_DIRECTORY, folderPath, 'app.pelela')
}

describe('createComponent', () => {
  it('creates a component in the src folder when invoked from the palette', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([NEW_COMPONENT_NAME])
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli)

    assert.equal(lastInputBox()?.prompt, t('commands.new.prompt'))
    assert.deepEqual(calls, [{ args: [NEW_ARGUMENT, NEW_COMPONENT_NAME], cwd: project.root }])
    assert.deepEqual(getShownDocuments(), [expectedComponentPath(project.root, '')])
    assert.deepEqual(getMessages(), [
      {
        kind: 'information',
        message: t('commands.new.success', { name: NEW_COMPONENT_NAME }),
      },
    ])
  })

  it('reveals the created template before opening it', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([NEW_COMPONENT_NAME])
    const { runCli } = createRecordingRunner()

    await createComponent(runCli)

    assert.deepEqual(getCommandInvocations(), [
      {
        command: REVEAL_COMMAND,
        args: [vscode.Uri.file(expectedComponentPath(project.root, ''))],
      },
    ])
  })

  it('uses the picked project when the workspace has several', async () => {
    const firstProject = createPelelaProject()
    const secondProject = createPelelaProject()
    setWorkspaceFolders([firstProject.root, secondProject.root])
    setQuickPickLabel(basename(secondProject.root))
    setInputBoxResponses([NEW_COMPONENT_NAME])
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli)

    assert.deepEqual(calls, [{ args: [NEW_ARGUMENT, NEW_COMPONENT_NAME], cwd: secondProject.root }])
  })

  it('does nothing when the project quick pick is cancelled', async () => {
    const firstProject = createPelelaProject()
    const secondProject = createPelelaProject()
    setWorkspaceFolders([firstProject.root, secondProject.root])
    setQuickPickLabel(undefined)
    setInputBoxResponses([NEW_COMPONENT_NAME])
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli)

    assert.deepEqual(calls, [])
    assert.equal(lastInputBox(), undefined)
  })

  it('reports a missing project when invoked from the palette', async () => {
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli)

    assert.deepEqual(calls, [])
    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.projectNotFound') },
    ])
  })

  it('creates the component in the selected folder', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([NEW_COMPONENT_NAME])
    const { runCli, calls } = createRecordingRunner()
    const folderUri = vscode.Uri.file(join(project.root, NAV_BAR_DIRECTORY))

    await createComponent(runCli, folderUri)

    assert.deepEqual(calls, [
      {
        args: [NEW_ARGUMENT, `${COMPONENTS_DIRECTORY}/${NEW_COMPONENT_NAME}`],
        cwd: project.root,
      },
    ])
    assert.deepEqual(getShownDocuments(), [
      expectedComponentPath(project.root, COMPONENTS_DIRECTORY),
    ])
  })

  it('creates the component in the folder of the selected file', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([NEW_COMPONENT_NAME])
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli, vscode.Uri.file(project.pelelaPath))

    assert.deepEqual(calls, [
      {
        args: [NEW_ARGUMENT, `${COMPONENTS_DIRECTORY}/${NEW_COMPONENT_NAME}`],
        cwd: project.root,
      },
    ])
  })

  it('reports a folder outside src', async () => {
    const project = createWorkspaceProject()
    const docsPath = join(project.root, 'docs')
    mkdirSync(docsPath)
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli, vscode.Uri.file(docsPath))

    assert.deepEqual(calls, [])
    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.outsideSrc', { file: docsPath }) },
    ])
  })

  it('reports a resource without a project', async () => {
    const root = createTempRoot()
    const missingPath = join(root, SRC_DIRECTORY, 'nav-bar.pelela')
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli, vscode.Uri.file(missingPath))

    assert.deepEqual(calls, [])
    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.projectNotFound') },
    ])
  })

  it('does nothing when the name input is cancelled', async () => {
    createWorkspaceProject()
    setInputBoxResponses([undefined])
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli)

    assert.deepEqual(calls, [])
    assert.deepEqual(getShownDocuments(), [])
    assert.deepEqual(getMessages(), [])
  })

  it('trims the typed name', async () => {
    const project = createWorkspaceProject()
    setInputBoxResponses([`  ${NEW_COMPONENT_NAME}  `])
    const { runCli, calls } = createRecordingRunner()

    await createComponent(runCli)

    assert.deepEqual(calls, [{ args: [NEW_ARGUMENT, NEW_COMPONENT_NAME], cwd: project.root }])
  })

  it('reports a failing CLI without opening a file', async () => {
    createWorkspaceProject()
    setInputBoxResponses([NEW_COMPONENT_NAME])
    const { runCli } = createRecordingRunner(FAILURE_RESULT)

    await createComponent(runCli)

    assert.deepEqual(getShownDocuments(), [])
    assert.deepEqual(getMessages(), [
      {
        kind: 'error',
        message: t('commands.error.cliFailed', {
          command: NEW_ARGUMENT,
          error: FAILURE_RESULT.stderr,
        }),
      },
    ])
  })

  it('reports a CLI that could not be spawned', async () => {
    createWorkspaceProject()
    setInputBoxResponses([NEW_COMPONENT_NAME])

    await createComponent(createThrowingRunner(THROWN_MESSAGE))

    assert.deepEqual(getMessages(), [{ kind: 'error', message: THROWN_MESSAGE }])
  })
})
