import i18next from 'i18next'
import enMessages from '../locales/en.json'
import esMessages from '../locales/es.json'

const SUPPORTED_LANGUAGES = ['en', 'es'] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

function detectLanguage(): SupportedLanguage {
  const envLang = process.env.LANG || process.env.LC_ALL || ''
  const langCode = envLang.split(/[-_.]/)[0]?.toLowerCase()

  if (langCode && (SUPPORTED_LANGUAGES as readonly string[]).includes(langCode)) {
    return langCode as SupportedLanguage
  }

  return 'en'
}

async function initializeI18n(language?: 'en' | 'es'): Promise<void> {
  const detectedLanguage = language || detectLanguage()

  await i18next.init({
    lng: detectedLanguage,
    fallbackLng: 'en',
    resources: {
      en: { translation: enMessages },
      es: { translation: esMessages },
    },
    interpolation: {
      escapeValue: false,
    },
  })
}

function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options) as string
}

function getCurrentLanguage(): SupportedLanguage {
  const current = i18next.language
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(current)
    ? (current as SupportedLanguage)
    : 'en'
}

export { initializeI18n, t, getCurrentLanguage }
