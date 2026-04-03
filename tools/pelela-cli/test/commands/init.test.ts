import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initCommand, normalizeProjectName, validateProjectName } from '../../src/commands/init'
import { initializeI18n, t } from '../../src/utils/i18n'
import * as shell from '../../src/utils/shell'
import * as templates from '../../src/utils/templates'

vi.mock('../../src/utils/templates')
vi.mock('../../src/utils/shell')

const mockedTemplates = vi.mocked(templates)
const mockedShell = vi.mocked(shell)

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
    mockedShell.directoryExists.mockReturnValue(false)
    mockedShell.resolvePath.mockImplementation((name) => `/mock/path/${name}`)
  })

  it('initializes project with custom name', async () => {
    await initCommand({ projectName: 'my-project' })

    expect(mockedTemplates.validateTemplatePath).toHaveBeenCalled()
    expect(mockedShell.directoryExists).toHaveBeenCalledWith('/mock/path/my-project')
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
    mockedShell.directoryExists.mockReturnValue(true)

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
})
