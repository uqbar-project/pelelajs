import { describe, expect, it } from 'vitest'

// Note: Testing the CLI entry point is challenging because it calls main() immediately
// and has side effects. We test the individual components that make up the CLI.

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
})
