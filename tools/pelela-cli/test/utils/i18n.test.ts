import i18next from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentLanguage, initializeI18n, t } from '../../src/utils/i18n'

describe('i18n', () => {
  beforeEach(async () => {
    // Reset i18next before each test
    await i18next.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: { translation: { test: 'Test message' } },
        es: { translation: { test: 'Mensaje de prueba' } },
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initializeI18n', () => {
    it('initializes with English by default', async () => {
      await initializeI18n('en')

      expect(getCurrentLanguage()).toBe('en')
    })

    it('initializes with Spanish when specified', async () => {
      await initializeI18n('es')

      expect(getCurrentLanguage()).toBe('es')
    })

    it('detects language from environment variable', async () => {
      vi.stubEnv('LANG', 'es_ES.UTF-8')

      await initializeI18n()

      expect(getCurrentLanguage()).toBe('es')

      vi.unstubAllEnvs()
    })

    it('detects language from environment variable with hyphen separator', async () => {
      vi.stubEnv('LANG', 'es-AR.UTF-8')

      await initializeI18n()

      expect(getCurrentLanguage()).toBe('es')

      vi.unstubAllEnvs()
    })

    it('detects language from environment variable with only hyphen', async () => {
      vi.stubEnv('LANG', 'en-GB')

      await initializeI18n()

      expect(getCurrentLanguage()).toBe('en')

      vi.unstubAllEnvs()
    })

    it('falls back to English for unsupported language with hyphen', async () => {
      vi.stubEnv('LANG', 'fr-CA.UTF-8')

      await initializeI18n()

      expect(getCurrentLanguage()).toBe('en')

      vi.unstubAllEnvs()
    })

    it('falls back to English for unsupported language', async () => {
      vi.stubEnv('LANG', 'fr_FR.UTF-8')

      await initializeI18n()

      expect(getCurrentLanguage()).toBe('en')

      vi.unstubAllEnvs()
    })

    it('falls back to English when no environment variable is set', async () => {
      vi.stubEnv('LANG', '')
      vi.stubEnv('LC_ALL', '')

      await initializeI18n()

      expect(getCurrentLanguage()).toBe('en')

      vi.unstubAllEnvs()
    })
  })

  describe('t', () => {
    it('returns translation for key', async () => {
      await initializeI18n('en')

      const result = t('cli.description')

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns translation with interpolation', async () => {
      await initializeI18n('en')

      const result = t('commands.init.error.directoryExists', { projectName: 'test' })

      expect(result).toContain('test')
    })

    it('returns key when translation is missing', async () => {
      await initializeI18n('en')

      const result = t('nonexistent.key')

      expect(result).toBe('nonexistent.key')
    })

    it('returns Spanish translation when language is es', async () => {
      await initializeI18n('es')

      const result = t('cli.description')

      expect(typeof result).toBe('string')
      // Spanish description should be different from English
      expect(result).not.toBe('CLI tool to work with PelelaJS projects')
    })
  })

  describe('getCurrentLanguage', () => {
    it('returns current language after initialization', async () => {
      await initializeI18n('es')

      expect(getCurrentLanguage()).toBe('es')
    })

    it('returns en for unsupported language', async () => {
      // Force i18next to have unsupported language
      await i18next.changeLanguage('fr')

      expect(getCurrentLanguage()).toBe('en')
    })
  })
})
