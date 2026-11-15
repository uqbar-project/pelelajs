import chalk from 'chalk'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addCommand } from '../../src/commands/add'
import { initializeI18n, t } from '../../src/utils/i18n'
import * as shell from '../../src/utils/shell'
import * as testingPreset from '../../src/utils/testingPreset'

vi.mock('../../src/utils/shell')
vi.mock('../../src/utils/testingPreset')

const mockedShell = vi.mocked(shell)
const mockedTestingPreset = vi.mocked(testingPreset)
const PROJECT_PATH = '/mock/project'

describe('addCommand', () => {
  beforeAll(async () => {
    await initializeI18n('en')
  })

  beforeEach(() => {
    mockedShell.resolvePath.mockClear()
    mockedTestingPreset.applyTestingPreset.mockClear()
    mockedTestingPreset.isTestingConfigured.mockClear()
    mockedShell.installDependencies.mockClear()
    mockedShell.resolvePath.mockReturnValue(PROJECT_PATH)
    mockedTestingPreset.applyTestingPreset.mockImplementation(() => undefined)
    mockedTestingPreset.isTestingConfigured.mockReturnValue(false)
    mockedTestingPreset.markTestingConfigured.mockClear()
    mockedTestingPreset.markTestingConfigured.mockImplementation(() => undefined)
    mockedShell.installDependencies.mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies the testing preset and installs the new dependencies', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    addCommand({ preset: 'testing' })

    expect(mockedTestingPreset.applyTestingPreset).toHaveBeenCalledWith(PROJECT_PATH)
    expect(mockedShell.installDependencies).toHaveBeenCalledWith(PROJECT_PATH)
    expect(mockedTestingPreset.markTestingConfigured).toHaveBeenCalledWith(PROJECT_PATH)
    expect(mockedShell.installDependencies.mock.invocationCallOrder[0]).toBeLessThan(
      mockedTestingPreset.markTestingConfigured.mock.invocationCallOrder[0],
    )
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith(chalk.green(t('commands.add.messages.testingApplied')))
  })

  it('propagates installation failures before reporting success', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const installationError = new Error('installation failed')
    mockedShell.installDependencies.mockImplementation(() => {
      throw installationError
    })

    expect(() => addCommand({ preset: 'testing' })).toThrow(installationError)
    expect(mockedTestingPreset.markTestingConfigured).not.toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('retries dependency installation after an interrupted install', () => {
    const installationError = new Error('installation failed')
    mockedShell.installDependencies
      .mockImplementationOnce(() => {
        throw installationError
      })
      .mockImplementationOnce(() => undefined)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    expect(() => addCommand({ preset: 'testing' })).toThrow(installationError)
    expect(mockedTestingPreset.markTestingConfigured).not.toHaveBeenCalled()

    addCommand({ preset: 'testing' })

    expect(mockedTestingPreset.applyTestingPreset).toHaveBeenCalledTimes(2)
    expect(mockedShell.installDependencies).toHaveBeenCalledTimes(2)
    expect(mockedTestingPreset.markTestingConfigured).toHaveBeenCalledWith(PROJECT_PATH)
    expect(logSpy).toHaveBeenCalledWith(chalk.green(t('commands.add.messages.testingApplied')))
  })

  it('reapplies the preset after an interrupted preset application', () => {
    const presetError = new Error('preset application failed')
    mockedTestingPreset.applyTestingPreset
      .mockImplementationOnce(() => {
        throw presetError
      })
      .mockImplementationOnce(() => undefined)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    expect(() => addCommand({ preset: 'testing' })).toThrow(presetError)
    expect(mockedShell.installDependencies).not.toHaveBeenCalled()
    expect(mockedTestingPreset.markTestingConfigured).not.toHaveBeenCalled()

    addCommand({ preset: 'testing' })

    expect(mockedTestingPreset.applyTestingPreset).toHaveBeenCalledTimes(2)
    expect(mockedShell.installDependencies).toHaveBeenCalledWith(PROJECT_PATH)
    expect(mockedTestingPreset.markTestingConfigured).toHaveBeenCalledWith(PROJECT_PATH)
    expect(logSpy).toHaveBeenCalledWith(chalk.green(t('commands.add.messages.testingApplied')))
  })

  it('rejects unsupported presets before applying any configuration', () => {
    expect(() => addCommand({ preset: 'linting' })).toThrow(
      t('commands.add.error.unknownPreset', { preset: 'linting' }),
    )
    expect(mockedTestingPreset.applyTestingPreset).not.toHaveBeenCalled()
    expect(mockedShell.installDependencies).not.toHaveBeenCalled()
  })

  it('is a no-op when testing is already configured', () => {
    mockedTestingPreset.isTestingConfigured.mockReturnValue(true)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    addCommand({ preset: 'testing' })

    expect(mockedTestingPreset.isTestingConfigured).toHaveBeenCalledWith(PROJECT_PATH)
    expect(mockedTestingPreset.applyTestingPreset).not.toHaveBeenCalled()
    expect(mockedShell.installDependencies).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith(chalk.green(t('commands.add.messages.alreadyConfigured')))
  })
})
