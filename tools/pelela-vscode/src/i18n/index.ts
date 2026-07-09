import { es } from './es'

type Locale = Record<string, unknown>

const locales: Record<string, Locale> = {
  es,
}

function lookupPath(obj: Locale, path: string[]): string | undefined {
  return path.reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) return undefined
    return (current as Record<string, unknown>)[key]
  }, obj) as string | undefined
}

export function t(key: string, params?: Record<string, string>): string {
  const locale = locales.es
  const path = key.split('.')
  let message = lookupPath(locale, path)

  if (message === undefined) return key

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      message = message.replace(`{{${paramKey}}}`, paramValue)
    }
  }

  return message
}
