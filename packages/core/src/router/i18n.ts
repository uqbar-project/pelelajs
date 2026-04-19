import enMessages from './locales/en.json'

type NestedMessages = { [key: string]: string | NestedMessages }

/**
 * Resolves a dot-separated key path against a nested object.
 * Example: resolve('errors.routing.routeNotFound', messages) → message string
 */
function resolve(key: string, messages: NestedMessages): string | undefined {
  const result = key.split('.').reduce<NestedMessages | string | undefined>((current, segment) => {
    if (current === undefined || typeof current === 'string') return undefined
    return current[segment]
  }, messages)

  return typeof result === 'string' ? result : undefined
}

/**
 * Translates a key with optional interpolation.
 * Uses {{variable}} syntax for placeholders, compatible with the i18next-based t() from the i18n PR.
 *
 * When the i18n PR merges, this function should be replaced by t() from commons/i18n.
 */
export function t(key: string, options?: Record<string, unknown>): string {
  const template = resolve(key, enMessages as NestedMessages) ?? key

  if (!options) return template

  return Object.entries(options).reduce<string>(
    (message, [variable, value]) => message.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), String(value)),
    template,
  )
}
