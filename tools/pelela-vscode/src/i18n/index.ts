import * as vscode from 'vscode'
import { en } from './en'
import { es } from './es'

type Locale = Record<string, unknown>

const locales: Record<string, Locale> = { en, es }
const DEFAULT_LOCALE = 'es'

function resolveLocale(): Locale {
  const language = vscode.env.language.split('-')[0]
  return locales[language] ?? locales[DEFAULT_LOCALE]
}

function lookupPath(obj: Locale, path: string[]): string | undefined {
  return path.reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) return undefined
    return (current as Record<string, unknown>)[key]
  }, obj) as string | undefined
}

export function interpolate(template: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (result, [paramKey, paramValue]) => result.replaceAll(`{{${paramKey}}}`, () => paramValue),
    template
  )
}

export function t(key: string, params?: Record<string, string>): string {
  const locale = resolveLocale()
  const path = key.split('.')
  const message = lookupPath(locale, path)

  if (message === undefined) return key

  if (params) {
    return interpolate(message, params)
  }

  return message
}
