import i18next from 'i18next'
import enMessages from './locales/en.json'
import esMessages from './locales/es.json'

const SUPPORTED_LANGUAGES = ['en', 'es'] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

function detectLanguage(): SupportedLanguage {
  // Browser detection
  if (typeof navigator !== 'undefined' && navigator.language) {
    const langCode = navigator.language.split('-')[0].toLowerCase()
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(langCode)) {
      return langCode as SupportedLanguage
    }
  }

  // Node detection (for tests)
  if (typeof process !== 'undefined' && process.env) {
    const envLang = process.env.LANG || process.env.LC_ALL || ''
    const langCode = envLang.split(/[-_.]/)[0]?.toLowerCase()

    if (langCode && (SUPPORTED_LANGUAGES as readonly string[]).includes(langCode)) {
      return langCode as SupportedLanguage
    }
  }

  return 'en'
}

/**
 * Initializes i18n support synchronously by providing resources directly.
 */
export function initializeI18n(language?: SupportedLanguage): void {
  const detectedLanguage = language || detectLanguage()

  if (i18next.isInitialized && !language) {
    // If already initialized and no specific language requested, we might want to
    // change language if detection would result in a different one (mostly for tests)
    if (i18next.language !== detectedLanguage) {
      i18next.changeLanguage(detectedLanguage)
    }
    return
  }

  // We use the synchronous init by providing all resources upfront
  i18next.init({
    lng: detectedLanguage,
    fallbackLng: 'en',
    resources: {
      en: { translation: enMessages },
      es: { translation: esMessages },
    },
    interpolation: {
      escapeValue: false, // Pelela handles its own sanitization
    },
    // This ensures initialization is as synchronous as possible
    initImmediate: false,
  })
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options)
}

export function getCurrentLanguage(): SupportedLanguage {
  const current = i18next.language
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(current)
    ? (current as SupportedLanguage)
    : 'en'
}

/**
 * Returns the decimal separator for the current language.
 * Uses Intl.NumberFormat for robust detection.
 */
export function getDecimalSeparator(): string {
  const locale = getCurrentLanguage()
  const numberWithDecimal = 1.1
  const parts = new Intl.NumberFormat(locale).formatToParts(numberWithDecimal)
  return parts.find((part) => part.type === 'decimal')?.value || '.'
}
