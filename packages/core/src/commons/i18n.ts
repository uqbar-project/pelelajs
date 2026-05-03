import i18next from 'i18next'
import {
  coreI18nDefaultNamespace,
  coreI18nResources,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './resources'

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
    const envLang = process.env.LC_ALL || process.env.LANG || ''
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
    defaultNS: coreI18nDefaultNamespace,
    resources: coreI18nResources,
    interpolation: {
      escapeValue: false, // Pelela handles its own sanitization
    },
    // This ensures initialization is as synchronous as possible
    initImmediate: false,
  })
}

export const t = i18next.t.bind(i18next) as typeof i18next.t

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

/**
 * Returns the thousands separator for the current language.
 * Uses Intl.NumberFormat for robust detection.
 */
export function getThousandsSeparator(): string {
  const locale = getCurrentLanguage()
  const numberWithThousands = 1234567.89
  const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(
    numberWithThousands,
  )
  const groupPart = parts.find((part) => part.type === 'group')

  if (groupPart) {
    return groupPart.value
  }

  // Robust fallback: return the opposite of the decimal separator
  return getDecimalSeparator() === ',' ? '.' : ','
}
