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

describe('addCommand', () => {
  beforeAll(async () => {
    await initializeI18n('en')
  })

  beforeEach(() => {
    mockedShell.resolvePath.mockClear()
    mockedTestingPreset.applyTestingPreset.mockClear()
    mockedShell.installDependencies.mockClear()
    mockedShell.resolvePath.mockReturnValue('/mock/project')
    mockedTestingPreset.applyTestingPreset.mockImplementation(() => undefined)
    mockedShell.installDependencies.mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies the testing preset and installs the new dependencies', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    addCommand({ preset: 'testing' })

    expect(mockedTestingPreset.applyTestingPreset).toHaveBeenCalledWith('/mock/project')
    expect(mockedShell.installDependencies).toHaveBeenCalledWith('/mock/project')
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
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('rejects unsupported presets before applying any configuration', () => {
    expect(() => addCommand({ preset: 'linting' })).toThrow(
      t('commands.add.error.unknownPreset', { preset: 'linting' }),
    )
    expect(mockedTestingPreset.applyTestingPreset).not.toHaveBeenCalled()
    expect(mockedShell.installDependencies).not.toHaveBeenCalled()
  })
})
