import { en } from './locales/en'
import { es } from './locales/es'

export const coreI18nDefaultNamespace = 'translation' as const

export const coreI18nResources = {
  en: { translation: en },
  es: { translation: es },
} as const

export const SUPPORTED_LANGUAGES = Object.keys(coreI18nResources) as Array<
  keyof typeof coreI18nResources
>

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
