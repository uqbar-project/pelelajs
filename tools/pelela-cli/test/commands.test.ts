import { beforeAll, describe, expect, it, vi } from 'vitest'
import { normalizeProjectName, validateProjectName } from '../src/commands/init'
import { initializeI18n, t } from '../src/utils/i18n'
import { checkNewVersion } from '../src/utils/version'

beforeAll(async () => {
  await initializeI18n('en')
})

describe('Project name validation', () => {
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
})

describe('Version check', () => {
  it('returns safe state when network fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })

  it('returns safe state when NPM registry response is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    )

    const result = await checkNewVersion()

    expect(result).toBeDefined()
    expect(result.hasUpdate).toBe(false)
    expect(result.latest).toBeNull()
  })
})
