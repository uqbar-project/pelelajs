import * as assert from 'node:assert/strict'
import { basename } from 'node:path'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import { addTesting } from '../../src/commands/addTesting'
import { t } from '../../src/i18n'
import { getMessages, setQuickPickLabel, setWorkspaceFolders } from '../vscode-stub'
import {
  createPelelaProject,
  createRecordingRunner,
  createThrowingRunner,
  FAILURE_RESULT,
  SUCCESS_RESULT,
} from './helpers'

const ADD_ARGUMENT = 'add'
const TESTING_PRESET = 'testing'
const THROWN_MESSAGE = 'spawn failed'

describe('addTesting', () => {
  it('reports a missing project', async () => {
    const { runCli, calls } = createRecordingRunner()

    await addTesting(runCli)

    assert.deepEqual(calls, [])
    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.projectNotFound') },
    ])
  })

  it('runs the add testing preset in the only project', async () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const { runCli, calls } = createRecordingRunner()

    await addTesting(runCli)

    assert.deepEqual(calls, [{ args: [ADD_ARGUMENT, TESTING_PRESET], cwd: project.root }])
    assert.deepEqual(getMessages(), [{ kind: 'information', message: SUCCESS_RESULT.stdout }])
  })

  it('uses the project root selected in the Explorer context menu', async () => {
    const project = createPelelaProject()
    const otherProject = createPelelaProject()
    setWorkspaceFolders([project.root, otherProject.root])
    const { runCli, calls } = createRecordingRunner()

    await addTesting(runCli, vscode.Uri.file(project.root))

    assert.deepEqual(calls, [{ args: [ADD_ARGUMENT, TESTING_PRESET], cwd: project.root }])
  })

  it('shows the CLI output without surrounding whitespace', async () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const { runCli } = createRecordingRunner({
      exitCode: SUCCESS_RESULT.exitCode,
      stdout: '  Testing configured  \n',
      stderr: '',
    })

    await addTesting(runCli)

    assert.deepEqual(getMessages(), [{ kind: 'information', message: 'Testing configured' }])
  })

  it('uses the project picked from the quick pick', async () => {
    const firstProject = createPelelaProject()
    const secondProject = createPelelaProject()
    setWorkspaceFolders([firstProject.root, secondProject.root])
    setQuickPickLabel(basename(secondProject.root))
    const { runCli, calls } = createRecordingRunner()

    await addTesting(runCli)

    assert.deepEqual(calls, [{ args: [ADD_ARGUMENT, TESTING_PRESET], cwd: secondProject.root }])
  })

  it('does nothing when the project quick pick is cancelled', async () => {
    const firstProject = createPelelaProject()
    const secondProject = createPelelaProject()
    setWorkspaceFolders([firstProject.root, secondProject.root])
    setQuickPickLabel(undefined)
    const { runCli, calls } = createRecordingRunner()

    await addTesting(runCli)

    assert.deepEqual(calls, [])
    assert.deepEqual(getMessages(), [])
  })

  it('reports a failing CLI', async () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const { runCli } = createRecordingRunner(FAILURE_RESULT)

    await addTesting(runCli)

    assert.deepEqual(getMessages(), [
      {
        kind: 'error',
        message: t('commands.error.cliFailed', {
          command: ADD_ARGUMENT,
          error: FAILURE_RESULT.stderr,
        }),
      },
    ])
  })

  it('reports a CLI that could not be spawned', async () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])

    await addTesting(createThrowingRunner(THROWN_MESSAGE))

    assert.deepEqual(getMessages(), [{ kind: 'error', message: THROWN_MESSAGE }])
  })
})
