import { execFile } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function runCli(args: string[]) {
  return execFileAsync('pnpm', ['exec', 'tsx', 'src/index.ts', ...args], {
    cwd: packageDirectory,
  })
}

describe('CLI structure', () => {
  it('exports expected modules from commands', async () => {
    const { initCommand } = await import('../src/commands/init')
    expect(initCommand).toBeDefined()
    expect(typeof initCommand).toBe('function')
  })

  it('exports expected modules from utils', async () => {
    const { initializeI18n, t, getCurrentLanguage } = await import('../src/utils/i18n')
    const { checkNewVersion, getCliVersion } = await import('../src/utils/version')

    expect(initializeI18n).toBeDefined()
    expect(t).toBeDefined()
    expect(getCurrentLanguage).toBeDefined()
    expect(checkNewVersion).toBeDefined()
    expect(getCliVersion).toBeDefined()
  })

  it('has required dependencies', async () => {
    const chalk = await import('chalk')
    const { Command } = await import('commander')

    expect(chalk.default).toBeDefined()
    expect(Command).toBeDefined()
  })

  it('runs the standalone CLI entrypoint in ESM mode and prints the version', async () => {
    const result = await runCli(['--version'])

    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    expect(result.stderr).toBe('')
  })

  it('shows the testing option in the init command help', async () => {
    const result = await runCli(['init', '--help'])

    expect(result.stdout).toContain('-T, --testing')
    expect(result.stderr).toBe('')
  })

  it('shows the add preset command in the CLI help', async () => {
    const result = await runCli(['add', '--help'])

    expect(result.stdout).toContain('add [options] <preset>')
    expect(result.stderr).toBe('')
  })

  it('shows the move command in the CLI help', async () => {
    const result = await runCli(['move', '--help'])

    expect(result.stdout).toContain('move [options]')
    expect(result.stderr).toBe('')
  })
})
