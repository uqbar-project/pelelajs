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
    mockedShell.resolvePath.mockReturnValue('/mock/project')
    mockedTestingPreset.applyTestingPreset.mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies the testing preset to the current project and prints the install step', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    addCommand({ preset: 'testing' })

    expect(mockedTestingPreset.applyTestingPreset).toHaveBeenCalledWith('/mock/project')
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      chalk.green(t('commands.add.messages.testingApplied')),
    )
    expect(logSpy).toHaveBeenNthCalledWith(2, chalk.dim(t('messages.install')))
  })

  it('rejects unsupported presets before applying any configuration', () => {
    expect(() => addCommand({ preset: 'linting' })).toThrow(
      t('commands.add.error.unknownPreset', { preset: 'linting' }),
    )
    expect(mockedTestingPreset.applyTestingPreset).not.toHaveBeenCalled()
  })
})
