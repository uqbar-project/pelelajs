import chalk from 'chalk'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initCommand, normalizeProjectName, validateProjectName } from '../../src/commands/init'
import { initializeI18n, t } from '../../src/utils/i18n'
import * as shell from '../../src/utils/shell'
import * as templates from '../../src/utils/templates'
import * as testingPreset from '../../src/utils/testingPreset'

vi.mock('../../src/utils/templates')
vi.mock('../../src/utils/shell')
vi.mock('../../src/utils/testingPreset')

const mockedTemplates = vi.mocked(templates)
const mockedShell = vi.mocked(shell)
const mockedTestingPreset = vi.mocked(testingPreset)

beforeAll(async () => {
  await initializeI18n('en')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('normalizeProjectName', () => {
  it('converts to lowercase', () => {
    expect(normalizeProjectName('MyProject')).toBe('myproject')
  })

  it('removes invalid characters', () => {
    expect(normalizeProjectName('My@Project#123')).toBe('my-project-123')
  })

  it('collapses multiple hyphens', () => {
    expect(normalizeProjectName('My---Project')).toBe('my-project')
  })

  it('removes leading and trailing hyphens', () => {
    expect(normalizeProjectName('-my-project-')).toBe('my-project')
  })

  it('handles spaces as hyphens', () => {
    expect(normalizeProjectName('my awesome project')).toBe('my-awesome-project')
  })
})

describe('validateProjectName', () => {
  it('throws for empty names', () => {
    expect(() => {
      validateProjectName('')
    }).toThrow(t('commands.init.error.nameEmpty'))
  })

  it('throws for names longer than 100 characters', () => {
    const longName = 'a'.repeat(101)
    expect(() => {
      validateProjectName(longName)
    }).toThrow(t('commands.init.error.nameTooLong'))
  })

  it('accepts valid names', () => {
    expect(() => {
      validateProjectName('my-valid-project')
    }).not.toThrow()
  })
})

describe('initCommand', () => {
  beforeEach(() => {
    mockedTemplates.validateTemplatePath.mockReturnValue(true)
    mockedTemplates.copyTemplate.mockImplementation(() => undefined)
    mockedTemplates.updateProjectPackageJson.mockImplementation(() => undefined)
    mockedTestingPreset.applyTestingPreset.mockClear()
    mockedTestingPreset.applyTestingPreset.mockImplementation(() => undefined)
    mockedShell.installDependencies.mockClear()
    mockedShell.installDependencies.mockImplementation(() => undefined)
    mockedShell.pathExists.mockReturnValue(false)
    mockedShell.resolvePath.mockImplementation((name) => `/mock/path/${name}`)
  })

  it('initializes project with custom name', async () => {
    await initCommand({ projectName: 'my-project' })

    expect(mockedTemplates.validateTemplatePath).toHaveBeenCalled()
    expect(mockedShell.pathExists).toHaveBeenCalledWith('/mock/path/my-project')
    expect(mockedTemplates.copyTemplate).toHaveBeenCalledWith('/mock/path/my-project')
    expect(mockedTemplates.updateProjectPackageJson).toHaveBeenCalledWith(
      '/mock/path/my-project',
      'my-project',
    )
  })

  it('initializes project with default name when no name provided', async () => {
    await initCommand({})

    expect(mockedTemplates.copyTemplate).toHaveBeenCalledWith('/mock/path/example')
    expect(mockedTemplates.updateProjectPackageJson).toHaveBeenCalledWith(
      '/mock/path/example',
      'example',
    )
  })

  it('throws error when template path is invalid', async () => {
    mockedTemplates.validateTemplatePath.mockReturnValue(false)

    await expect(initCommand({ projectName: 'test' })).rejects.toThrow(
      t('commands.init.error.templateNotFound'),
    )
  })

  it('throws error when directory already exists', async () => {
    mockedShell.pathExists.mockReturnValue(true)

    await expect(initCommand({ projectName: 'existing' })).rejects.toThrow(
      t('commands.init.error.directoryExists', { projectName: 'existing' }),
    )
  })

  it('throws error when copyTemplate fails', async () => {
    mockedTemplates.copyTemplate.mockImplementation(() => {
      throw new Error('Copy failed')
    })

    await expect(initCommand({ projectName: 'test' })).rejects.toThrow(
      t('commands.init.error.initializationFailed', { error: 'Copy failed' }),
    )
  })

  it('throws error when updateProjectPackageJson fails', async () => {
    mockedTemplates.updateProjectPackageJson.mockImplementation(() => {
      throw new Error('Update failed')
    })

    await expect(initCommand({ projectName: 'test' })).rejects.toThrow(
      t('commands.init.error.initializationFailed', { error: 'Update failed' }),
    )
  })

  it('normalizes project name before using', async () => {
    await initCommand({ projectName: 'My Project!!!' })

    expect(mockedTemplates.updateProjectPackageJson).toHaveBeenCalledWith(
      '/mock/path/my-project',
      'my-project',
    )
  })

  it('installs dependencies in the new project directory', async () => {
    await initCommand({ projectName: 'my-project' })

    expect(mockedShell.installDependencies).toHaveBeenCalledWith('/mock/path/my-project')
  })

  it('applies the testing preset before installing dependencies', async () => {
    await initCommand({ projectName: 'my-project', testing: true })

    expect(mockedTestingPreset.applyTestingPreset).toHaveBeenCalledWith('/mock/path/my-project')
    const presetOrder = mockedTestingPreset.applyTestingPreset.mock.invocationCallOrder[0]
    const installOrder = mockedShell.installDependencies.mock.invocationCallOrder[0]
    expect(presetOrder).toBeLessThan(installOrder)
  })

  it('does not suggest a manual install in the next steps', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const projectName = 'my-project'

    await initCommand({ projectName })

    const [, ...nextStepsCalls] = logSpy.mock.calls
    expect(nextStepsCalls).toEqual([
      [chalk.dim(t('messages.nextSteps'))],
      [chalk.cyan(`  ${t('messages.cdProject', { projectName })}`)],
      [chalk.cyan(`  ${t('messages.dev')}`)],
      [],
    ])
  })

  it('propagates installation failures without wrapping them', async () => {
    mockedShell.installDependencies.mockImplementation(() => {
      throw new Error('installation failed')
    })

    await expect(initCommand({ projectName: 'my-project' })).rejects.toThrow(
      new Error('installation failed'),
    )
  })
})
