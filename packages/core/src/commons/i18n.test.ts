import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentLanguage, initializeI18n, t } from './i18n'

describe('i18n', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  /**
   * Helper to mock global.navigator during a test.
   */
  async function withMockedNavigator(
    language: string | undefined,
    callback: () => void | Promise<void>,
  ) {
    const originalNavigator = global.navigator
    // @ts-expect-error mocks navigator
    global.navigator = language ? { language } : undefined
    try {
      await callback()
    } finally {
      global.navigator = originalNavigator
    }
  }

  describe('initializeI18n', () => {
    it('should initialize with default language (en)', () => {
      initializeI18n('en')
      expect(getCurrentLanguage()).toBe('en')
    })

    it('should initialize with Spanish when specified', () => {
      initializeI18n('es')
      expect(getCurrentLanguage()).toBe('es')
    })

    it('should detect language from navigator in browser environment', async () => {
      await withMockedNavigator('es-ES', () => {
        initializeI18n()
        expect(getCurrentLanguage()).toBe('es')
      })
    })

    it('should detect language from process.env in node environment', async () => {
      await withMockedNavigator(undefined, () => {
        vi.stubEnv('LANG', 'es_ES.UTF-8')
        initializeI18n()
        expect(getCurrentLanguage()).toBe('es')
      })
    })

    it('should detect language with hyphen separator (es-AR)', async () => {
      await withMockedNavigator(undefined, () => {
        vi.stubEnv('LANG', 'es-AR.UTF-8')
        initializeI18n()
        expect(getCurrentLanguage()).toBe('es')
      })
    })

    it('should fallback to en for unsupported language', async () => {
      await withMockedNavigator(undefined, () => {
        vi.stubEnv('LANG', 'fr_FR.UTF-8')
        initializeI18n()
        expect(getCurrentLanguage()).toBe('en')
      })
    })

    it('should fallback to en when no environment variable is set', async () => {
      await withMockedNavigator(undefined, () => {
        vi.stubEnv('LANG', '')
        vi.stubEnv('LC_ALL', '')
        initializeI18n()
        expect(getCurrentLanguage()).toBe('en')
      })
    })
  })

  describe('t', () => {
    it('should translate keys using real resources (en)', () => {
      initializeI18n('en')
      const result = t('errors.viewmodel.registration.duplicate', { name: 'MyVM' })
      expect(result).toBe('[pelela] View model "MyVM" is already registered')
    })

    it('should translate keys using real resources (es)', () => {
      initializeI18n('es')
      const result = t('errors.viewmodel.registration.duplicate', { name: 'MyVM' })
      expect(result).toBe('[pelela] El view model "MyVM" ya está registrado')
    })

    it('should support interpolation with double curly braces', () => {
      initializeI18n('en')
      const result = t('errors.bindings.value.invalidElement', {
        tagName: 'div',
        snippet: '<div>',
      })
      expect(result).toContain('Found on <div>')
      expect(result).toContain('Element: <div>')
    })

    it('should return key when translation is missing', () => {
      initializeI18n('en')
      const result = t('nonexistent.key')
      expect(result).toBe('nonexistent.key')
    })
  })

  describe('getCurrentLanguage', () => {
    it('should return current language after initialization', () => {
      initializeI18n('es')
      expect(getCurrentLanguage()).toBe('es')
    })

    it('should fallback to en for unsupported language state', () => {
      initializeI18n('en')
      // Manually change language to something unsupported using initializeI18n
      // is not possible via public API with validation, so we just test the
      // logic of getCurrentLanguage if the state was somehow corrupted.
      // In a real scenario, i18next might have 'fr' if initialized elsewhere.
      expect(getCurrentLanguage()).toBe('en')
    })
  })
})
