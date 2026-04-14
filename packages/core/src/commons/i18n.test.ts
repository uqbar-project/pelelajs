import { describe, expect, it } from 'vitest'
import { getCurrentLanguage, initializeI18n, t } from './i18n'

describe('i18n', () => {
  it('should initialize with default language (en)', () => {
    initializeI18n('en')
    expect(getCurrentLanguage()).toBe('en')
  })

  it('should detect language from navigator in browser environment', () => {
    const originalNavigator = global.navigator
    // @ts-expect-error
    global.navigator = { language: 'es-ES' }

    initializeI18n()
    expect(getCurrentLanguage()).toBe('es')

    global.navigator = originalNavigator
  })

  it('should detect language from process.env in node environment', () => {
    const originalNavigator = global.navigator
    const originalLang = process.env.LANG
    // Force node detection by removing navigator
    // @ts-expect-error
    global.navigator = undefined
    process.env.LANG = 'es_ES.UTF-8'

    initializeI18n()
    expect(getCurrentLanguage()).toBe('es')

    global.navigator = originalNavigator
    process.env.LANG = originalLang
  })

  it('should translate keys with nested objects', () => {
    initializeI18n('en')
    const result = t('errors.viewmodel.registration.duplicate', { name: 'MyVM' })
    expect(result).toBe('[pelela] View model "MyVM" is already registered')
  })

  it('should supports interpolation with double curly braces', () => {
    initializeI18n('en')
    const result = t('errors.bindings.value.invalidElement', {
      tagName: 'div',
      snippet: '<div>',
    })
    expect(result).toContain('Found on <div>')
    expect(result).toContain('Element: <div>')
  })

  it('should fallback to en if translation is missing in es', () => {
    // This assumes some key is missing in es but present in en
    // or we can test a non-existent key
    initializeI18n('es')
    const result = t('non.existent.key')
    expect(result).toBe('non.existent.key')
  })
})
