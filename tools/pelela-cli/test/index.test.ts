import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

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
    const result = await execFileAsync('pnpm', [
      '-C',
      'tools/pelela-cli',
      'exec',
      'tsx',
      'src/index.ts',
      '--version',
    ])

    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    expect(result.stderr).toBe('')
  })
})
