import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import * as vscode from 'vscode'
import { t } from '../i18n'

export interface CliResult {
  exitCode: number
  stdout: string
  stderr: string
}

export type CliRunner = (args: string[], cwd: string) => Promise<CliResult>

export interface ResolveCliEntrypointOptions {
  projectRoot: string
  override?: string
}

export interface CliCommandOptions {
  runCli: CliRunner
  command: string
  args: string[]
  cwd: string
}

const PELELA_PACKAGE = 'pelelajs'
const PELELA_BIN = 'pelela'
const DEFAULT_NODE_PATH = 'node'
const CLI_CONFIGURATION = 'pelela'
const CLI_PATH_SETTING = 'cli.path'
const CLI_NODE_PATH_SETTING = 'cli.nodePath'
const FAILED_EXIT_CODE = -1
const SUCCESS_EXIT_CODE = 0
const ANSI_ESCAPE = '\u001b'
const ANSI_PATTERN = /^\[[0-9;]*m/

const CLI_ENV = {
  NO_COLOR: '1',
  FORCE_COLOR: '0',
  PELELA_SKIP_UPDATE_CHECK: '1',
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readSetting(key: string, defaultValue: string): string {
  return vscode.workspace.getConfiguration(CLI_CONFIGURATION).get<string>(key) ?? defaultValue
}

export function stripAnsi(value: string): string {
  return value
    .split(ANSI_ESCAPE)
    .map((segment, index) => {
      if (index === 0) {
        return segment
      }

      const strippedSegment = segment.replace(ANSI_PATTERN, '')
      return strippedSegment === segment ? `${ANSI_ESCAPE}${segment}` : strippedSegment
    })
    .join('')
}

export function normalizeExitCode(exitCode: number | null): number {
  return exitCode ?? FAILED_EXIT_CODE
}

function readBinEntrypoint(packageJsonPath: string): string | undefined {
  try {
    const packageJson: unknown = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    if (!isRecord(packageJson)) {
      return undefined
    }

    const bin = packageJson.bin
    const relativeEntrypoint =
      typeof bin === 'string' ? bin : isRecord(bin) ? bin[PELELA_BIN] : undefined

    return typeof relativeEntrypoint === 'string'
      ? resolve(dirname(packageJsonPath), relativeEntrypoint)
      : undefined
  } catch {
    return undefined
  }
}

function findInstalledEntrypoint(startDirectory: string): string | undefined {
  const packageJsonPath = join(startDirectory, 'node_modules', PELELA_PACKAGE, 'package.json')
  if (existsSync(packageJsonPath)) {
    return readBinEntrypoint(packageJsonPath)
  }

  const parentDirectory = dirname(startDirectory)
  return parentDirectory === startDirectory ? undefined : findInstalledEntrypoint(parentDirectory)
}

/**
 * The published `pelelajs` package exposes the CLI as a `bin`, so there is no
 * need for `npx`, network access or the `.bin` shell shims (which break on
 * Windows). An explicit setting wins over the installed package.
 */
export function resolveCliEntrypoint(options: ResolveCliEntrypointOptions): string {
  const { projectRoot, override } = options
  if (override) {
    return isAbsolute(override) ? override : resolve(projectRoot, override)
  }

  const entrypoint = findInstalledEntrypoint(projectRoot)
  if (entrypoint === undefined) {
    throw new Error(t('commands.error.cliNotFound'))
  }

  return entrypoint
}

export function runProcess(command: string, args: string[], cwd: string): Promise<CliResult> {
  return new Promise((resolveProcess) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...CLI_ENV },
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', (error: Error) => {
      resolveProcess({
        exitCode: FAILED_EXIT_CODE,
        stdout: stripAnsi(stdout),
        stderr: error.message,
      })
    })
    child.on('close', (exitCode: number | null) => {
      resolveProcess({
        exitCode: normalizeExitCode(exitCode),
        stdout: stripAnsi(stdout),
        stderr: stripAnsi(stderr),
      })
    })
  })
}

export function createCliRunner(output?: vscode.OutputChannel): CliRunner {
  return async (args, cwd) => {
    const nodePath = readSetting(CLI_NODE_PATH_SETTING, DEFAULT_NODE_PATH)
    const entrypoint = resolveCliEntrypoint({
      projectRoot: cwd,
      override: readSetting(CLI_PATH_SETTING, ''),
    })

    output?.appendLine(`$ ${nodePath} ${entrypoint} ${args.join(' ')}`)

    const result = await runProcess(nodePath, [entrypoint, ...args], cwd)
    const outputLines = [result.stdout, result.stderr].filter((line) => line !== '')
    outputLines.forEach((line) => {
      output?.appendLine(line.trimEnd())
    })

    return result
  }
}

/**
 * Runs a CLI command and reports failures in the editor, so every handler only
 * has to deal with the success path.
 */
export async function runCliWithFeedback(
  options: CliCommandOptions
): Promise<CliResult | undefined> {
  const { runCli, command, args, cwd } = options

  try {
    const result = await runCli(args, cwd)
    if (result.exitCode === SUCCESS_EXIT_CODE) {
      return result
    }

    const stderr = result.stderr.trim()
    const error = stderr === '' ? t('commands.error.cliFailedWithoutOutput') : stderr
    await vscode.window.showErrorMessage(t('commands.error.cliFailed', { command, error }))
    return undefined
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await vscode.window.showErrorMessage(message)
    return undefined
  }
}
