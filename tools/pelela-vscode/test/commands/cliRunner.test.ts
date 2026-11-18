import * as assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { beforeEach, describe, it } from 'mocha'
import * as vscode from 'vscode'
import type { CliResult, CliRunner } from '../../src/commands/cliRunner'
import {
  createCliRunner,
  normalizeExitCode,
  resolveCliEntrypoint,
  runCliWithFeedback,
  runProcess,
  stripAnsi,
} from '../../src/commands/cliRunner'
import { t } from '../../src/i18n'
import { getMessages, lastOutputChannel, setSetting } from '../vscode-stub'
import { createTempRoot, writeProjectFile } from './helpers'

const ESCAPE = '\u001b'
const RED_TEXT = `${ESCAPE}[31mred${ESCAPE}[39m`
const PLAIN_RED_TEXT = 'red'
const UNSUPPORTED_ANSI_SEQUENCE = `${ESCAPE}[2Jscreen`
const FAKE_CLI_SCRIPT = 'fake-cli.js'
const PELELA_PACKAGE_PATH = join('node_modules', 'pelelajs', 'package.json')
const CLI_PACKAGE_PATH = join('node_modules', '@pelelajs', 'cli', 'package.json')
const PELELA_BIN_PATH = join('node_modules', 'pelelajs', 'dist', 'cli.cjs')
const CLI_BIN_PATH = join('node_modules', '@pelelajs', 'cli', 'dist', 'index.js')
const BIN_STRING = './dist/cli.cjs'
const CLI_BIN_STRING = './dist/index.js'
const BIN_WITHOUT_PELELA = JSON.stringify({ name: 'pelelajs', bin: { other: './other.js' } })
const MALFORMED_PACKAGE_JSON = '{ invalid json'
const PELELA_COMMAND = 'rename'
const CLI_FAILURE_MESSAGE = 'component not found'
const THROWN_ERROR_MESSAGE = 'spawn failed'
const THROWN_VALUE = 'offline'
const SUCCESS_EXIT_CODE = 0
const FAILURE_EXIT_CODE = 1
const DEFAULT_FAILED_EXIT_CODE = -1

function writeFakeCli(root: string, source: string): string {
  return writeProjectFile(root, FAKE_CLI_SCRIPT, source)
}

function writePelelaPackage(projectRoot: string, content: string): string {
  writeProjectFile(projectRoot, PELELA_PACKAGE_PATH, content)
  writeProjectFile(projectRoot, PELELA_BIN_PATH, '')
  return projectRoot
}

function writeCliPackage(projectRoot: string, content: string): string {
  writeProjectFile(projectRoot, CLI_PACKAGE_PATH, content)
  writeProjectFile(projectRoot, CLI_BIN_PATH, '')
  return projectRoot
}

describe('stripAnsi', () => {
  it('removes ANSI color codes', () => {
    assert.equal(stripAnsi(RED_TEXT), PLAIN_RED_TEXT)
  })

  it('leaves plain text untouched', () => {
    assert.equal(stripAnsi(PLAIN_RED_TEXT), PLAIN_RED_TEXT)
  })

  it('leaves unsupported ANSI sequences untouched', () => {
    assert.equal(stripAnsi(UNSUPPORTED_ANSI_SEQUENCE), UNSUPPORTED_ANSI_SEQUENCE)
  })
})

describe('normalizeExitCode', () => {
  it('maps a missing exit code to a failure', () => {
    assert.equal(normalizeExitCode(null), DEFAULT_FAILED_EXIT_CODE)
  })

  it('keeps a real exit code', () => {
    assert.equal(normalizeExitCode(SUCCESS_EXIT_CODE), SUCCESS_EXIT_CODE)
  })
})

describe('resolveCliEntrypoint', () => {
  it('returns an absolute override as is', () => {
    const override = resolve('opt', 'pelela', 'cli.cjs')

    assert.equal(resolveCliEntrypoint({ projectRoot: '/projects/app', override }), override)
  })

  it('resolves a relative override against the project root', () => {
    const projectRoot = createTempRoot()

    assert.equal(
      resolveCliEntrypoint({ projectRoot, override: 'scripts/cli.cjs' }),
      join(projectRoot, 'scripts', 'cli.cjs')
    )
  })

  it('resolves the bin string of the installed package', () => {
    const projectRoot = createTempRoot()
    writePelelaPackage(projectRoot, JSON.stringify({ name: 'pelelajs', bin: BIN_STRING }))

    assert.equal(
      resolveCliEntrypoint({ projectRoot }),
      join(projectRoot, 'node_modules', 'pelelajs', 'dist', 'cli.cjs')
    )
  })

  it('resolves the pelela entry of a bin object', () => {
    const projectRoot = createTempRoot()
    writePelelaPackage(
      projectRoot,
      JSON.stringify({ name: 'pelelajs', bin: { pelela: BIN_STRING } })
    )

    assert.equal(
      resolveCliEntrypoint({ projectRoot }),
      join(projectRoot, 'node_modules', 'pelelajs', 'dist', 'cli.cjs')
    )
  })

  it('looks for the package in parent folders (hoisted installs)', () => {
    const monorepoRoot = createTempRoot()
    const projectRoot = join(monorepoRoot, 'packages', 'app')
    writePelelaPackage(monorepoRoot, JSON.stringify({ name: 'pelelajs', bin: BIN_STRING }))

    assert.equal(
      resolveCliEntrypoint({ projectRoot }),
      join(monorepoRoot, 'node_modules', 'pelelajs', 'dist', 'cli.cjs')
    )
  })

  it('resolves the bin of the standalone CLI package', () => {
    const projectRoot = createTempRoot()
    writeCliPackage(
      projectRoot,
      JSON.stringify({ name: '@pelelajs/cli', bin: { pelela: CLI_BIN_STRING } })
    )

    assert.equal(
      resolveCliEntrypoint({ projectRoot }),
      join(projectRoot, 'node_modules', '@pelelajs', 'cli', 'dist', 'index.js')
    )
  })

  it('does not resolve a bin entrypoint that is missing from its package', () => {
    const projectRoot = createTempRoot()
    writeProjectFile(
      projectRoot,
      PELELA_PACKAGE_PATH,
      JSON.stringify({ name: 'pelelajs', bin: BIN_STRING })
    )

    assert.throws(() => resolveCliEntrypoint({ projectRoot }), {
      message: t('commands.error.cliNotFound'),
    })
  })

  it('fails when the installed package has no pelela bin', () => {
    const projectRoot = createTempRoot()
    writePelelaPackage(projectRoot, BIN_WITHOUT_PELELA)

    assert.throws(() => resolveCliEntrypoint({ projectRoot }), {
      message: t('commands.error.cliNotFound'),
    })
  })

  it('fails when the installed package.json is malformed', () => {
    const projectRoot = createTempRoot()
    writePelelaPackage(projectRoot, MALFORMED_PACKAGE_JSON)

    assert.throws(() => resolveCliEntrypoint({ projectRoot }), {
      message: t('commands.error.cliNotFound'),
    })
  })

  it('fails when the installed package.json is not an object', () => {
    const projectRoot = createTempRoot()
    writePelelaPackage(projectRoot, JSON.stringify(['pelelajs']))

    assert.throws(() => resolveCliEntrypoint({ projectRoot }), {
      message: t('commands.error.cliNotFound'),
    })
  })

  it('fails when the package is not installed', () => {
    const projectRoot = createTempRoot()

    assert.throws(() => resolveCliEntrypoint({ projectRoot }), {
      message: t('commands.error.cliNotFound'),
    })
  })
})

describe('runProcess', () => {
  it('returns the exit code and stdout of a successful process', async () => {
    const root = createTempRoot()
    const script = writeFakeCli(root, "process.stdout.write('created component')")

    const result = await runProcess(process.execPath, [script], root)

    assert.equal(result.exitCode, SUCCESS_EXIT_CODE)
    assert.equal(result.stdout, 'created component')
    assert.equal(result.stderr, '')
  })

  it('returns the exit code and stderr of a failing process', async () => {
    const root = createTempRoot()
    const script = writeFakeCli(
      root,
      `process.stderr.write('${CLI_FAILURE_MESSAGE}'); process.exit(${FAILURE_EXIT_CODE})`
    )

    const result = await runProcess(process.execPath, [script], root)

    assert.equal(result.exitCode, FAILURE_EXIT_CODE)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr, CLI_FAILURE_MESSAGE)
  })

  it('strips ANSI codes from the captured output', async () => {
    const root = createTempRoot()
    const script = writeFakeCli(root, "process.stdout.write('\\u001b[31mred\\u001b[39m')")

    const result = await runProcess(process.execPath, [script], root)

    assert.equal(result.stdout, PLAIN_RED_TEXT)
  })

  it('reports a failure when the command cannot be spawned', async () => {
    const root = createTempRoot()

    const result = await runProcess(join(root, 'missing-cli'), [], root)

    assert.equal(result.exitCode, DEFAULT_FAILED_EXIT_CODE)
    assert.equal(result.stdout, '')
    assert.notEqual(result.stderr, '')
  })
})

describe('createCliRunner', () => {
  const EXPECTED_ARGUMENTS = 'rename components/NavBar NewName'

  beforeEach(() => {
    setSetting('pelela.cli.nodePath', process.execPath)
  })

  it('runs the configured entrypoint with the given arguments', async () => {
    const root = createTempRoot()
    const script = writeFakeCli(root, 'process.stdout.write(process.argv.slice(2).join(" "))')
    setSetting('pelela.cli.path', script)

    const result = await createCliRunner()(['rename', 'components/NavBar', 'NewName'], root)

    assert.equal(result.exitCode, SUCCESS_EXIT_CODE)
    assert.equal(result.stdout, EXPECTED_ARGUMENTS)
  })

  it('logs the command and its output in the channel', async () => {
    const root = createTempRoot()
    const script = writeFakeCli(root, 'process.stdout.write("created")')
    setSetting('pelela.cli.path', script)
    const output = vscode.window.createOutputChannel('Pelela')

    await createCliRunner(output)(['new', 'App'], root)

    assert.deepEqual(lastOutputChannel()?.lines, [
      `$ ${process.execPath} ${script} new App`,
      'created',
    ])
  })

  it('logs stderr when the command fails', async () => {
    const root = createTempRoot()
    const script = writeFakeCli(
      root,
      `process.stderr.write('${CLI_FAILURE_MESSAGE}'); process.exit(${FAILURE_EXIT_CODE})`
    )
    setSetting('pelela.cli.path', script)
    const output = vscode.window.createOutputChannel('Pelela')

    await createCliRunner(output)(['rename', 'components/NavBar', 'NewName'], root)

    assert.deepEqual(lastOutputChannel()?.lines, [
      `$ ${process.execPath} ${script} rename components/NavBar NewName`,
      CLI_FAILURE_MESSAGE,
    ])
  })

  it('defaults the node executable to "node"', async () => {
    const root = createTempRoot()
    const script = writeFakeCli(root, 'process.stdout.write("ok")')
    setSetting('pelela.cli.path', script)
    const runCli = createCliRunner()

    const result = await runCli([], root)

    assert.equal(result.stdout, 'ok')
  })
})

function createFakeRunner(result: CliResult): CliRunner {
  return () => Promise.resolve(result)
}

describe('runCliWithFeedback', () => {
  it('returns the result on success', async () => {
    const result = { exitCode: SUCCESS_EXIT_CODE, stdout: 'done', stderr: '' }

    const feedback = await runCliWithFeedback({
      runCli: createFakeRunner(result),
      command: PELELA_COMMAND,
      args: [],
      cwd: '/projects/app',
    })

    assert.deepEqual(feedback, result)
    assert.deepEqual(getMessages(), [])
  })

  it('reports the stderr of a failing command', async () => {
    const result = {
      exitCode: FAILURE_EXIT_CODE,
      stdout: '',
      stderr: `${CLI_FAILURE_MESSAGE}\n`,
    }

    const feedback = await runCliWithFeedback({
      runCli: createFakeRunner(result),
      command: PELELA_COMMAND,
      args: [],
      cwd: '/projects/app',
    })

    assert.equal(feedback, undefined)
    assert.deepEqual(getMessages(), [
      {
        kind: 'error',
        message: t('commands.error.cliFailed', {
          command: PELELA_COMMAND,
          error: CLI_FAILURE_MESSAGE,
        }),
      },
    ])
  })

  it('reports a failure without stderr', async () => {
    const result = { exitCode: FAILURE_EXIT_CODE, stdout: '', stderr: '  ' }

    const feedback = await runCliWithFeedback({
      runCli: createFakeRunner(result),
      command: PELELA_COMMAND,
      args: [],
      cwd: '/projects/app',
    })

    assert.equal(feedback, undefined)
    assert.deepEqual(getMessages(), [
      {
        kind: 'error',
        message: t('commands.error.cliFailed', {
          command: PELELA_COMMAND,
          error: t('commands.error.cliFailedWithoutOutput'),
        }),
      },
    ])
  })

  it('reports an error thrown by the runner', async () => {
    const runCli: CliRunner = () => Promise.reject(new Error(THROWN_ERROR_MESSAGE))

    const feedback = await runCliWithFeedback({
      runCli,
      command: PELELA_COMMAND,
      args: [],
      cwd: '/projects/app',
    })

    assert.equal(feedback, undefined)
    assert.deepEqual(getMessages(), [{ kind: 'error', message: THROWN_ERROR_MESSAGE }])
  })

  it('reports a non-Error value thrown by the runner', async () => {
    const runCli: CliRunner = () => Promise.reject(THROWN_VALUE)

    const feedback = await runCliWithFeedback({
      runCli,
      command: PELELA_COMMAND,
      args: [],
      cwd: '/projects/app',
    })

    assert.equal(feedback, undefined)
    assert.deepEqual(getMessages(), [{ kind: 'error', message: THROWN_VALUE }])
  })
})
