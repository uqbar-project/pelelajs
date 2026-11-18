import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { CliResult, CliRunner } from '../../src/commands/cliRunner'

export const SAMPLE_PROJECT_NAME = 'sample-project'
export const PELELA_PACKAGE_JSON = JSON.stringify({
  name: SAMPLE_PROJECT_NAME,
  dependencies: { pelelajs: 'latest' },
})
export const CLI_PACKAGE_JSON = JSON.stringify({
  name: SAMPLE_PROJECT_NAME,
  devDependencies: { '@pelelajs/cli': 'latest' },
})

export const SRC_DIRECTORY = 'src'
export const COMPONENTS_DIRECTORY = 'components'
export const NAV_BAR_DIRECTORY = join(SRC_DIRECTORY, COMPONENTS_DIRECTORY)
export const NAV_BAR_PELELA_PATH = join(NAV_BAR_DIRECTORY, 'nav-bar.pelela')
export const NAV_BAR_TS_PATH = join(NAV_BAR_DIRECTORY, 'nav-bar.ts')

const TEMP_PREFIX = 'pelela-extension-test-'
const tempDirectories: string[] = []

export function cleanupTempDirectories(): void {
  tempDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true })
  })
}

export function createTempRoot(prefix: string = TEMP_PREFIX): string {
  const root = mkdtempSync(join(tmpdir(), prefix))
  tempDirectories.push(root)
  return root
}

export function writeProjectFile(root: string, relativePath: string, content: string): string {
  const filePath = join(root, relativePath)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, content)
  return filePath
}

export function pelelaTemplate(viewModelName: string): string {
  return `<pelela view-model="${viewModelName}">\n</pelela>\n`
}

export interface PelelaProject {
  root: string
  pelelaPath: string
  tsPath: string
  viewModelName: string
}

export interface RecordedCliCall {
  args: string[]
  cwd: string
}

export interface RecordingCliRunner {
  runCli: CliRunner
  calls: RecordedCliCall[]
}

export const SUCCESS_RESULT: CliResult = { exitCode: 0, stdout: 'done', stderr: '' }
export const FAILURE_RESULT: CliResult = {
  exitCode: 1,
  stdout: '',
  stderr: 'component not found',
}

export function createRecordingRunner(result: CliResult = SUCCESS_RESULT): RecordingCliRunner {
  const calls: RecordedCliCall[] = []
  const runCli: CliRunner = (args, cwd) => {
    calls.push({ args: [...args], cwd })
    return Promise.resolve(result)
  }

  return { runCli, calls }
}

export function createThrowingRunner(message: string): CliRunner {
  return () => Promise.reject(new Error(message))
}

/**
 * Minimal project layout the CLI and the extension both understand: a package
 * that declares `pelelajs`, a `src` folder and one component under
 * `src/components`.
 */
export function createPelelaProject(
  viewModelName = 'NavBar',
  packageJson: string = PELELA_PACKAGE_JSON
): PelelaProject {
  const root = createTempRoot()
  writeProjectFile(root, 'package.json', packageJson)
  const pelelaPath = writeProjectFile(root, NAV_BAR_PELELA_PATH, pelelaTemplate(viewModelName))
  const tsPath = writeProjectFile(root, NAV_BAR_TS_PATH, `export class ${viewModelName} {\n}\n`)

  return { root, pelelaPath, tsPath, viewModelName }
}
