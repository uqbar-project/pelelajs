/**
 * Utility for sanitizing strings to prevent XSS and other injection attacks.
 * Follows OWASP recommendations for basic HTML escaping.
 */

/**
 * Escapes HTML special characters in a string.
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, (character) => map[character])
}

/**
 * Sanitizes any value. If it's a string, it's escaped.
 * If it's an object/array, it recurses (safely).
 * Note: For objects, returns a plain object without preserving the prototype.
 * Class instances will lose their methods.
 */
export function sanitize<T>(value: T): T {
  if (typeof value === 'string') {
    return escapeHTML(value) as unknown as T
  }

  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item)) as unknown as T
  }

  const result = {} as Record<string, unknown>
  Object.entries(value).forEach(([key, val]) => {
    result[key] = sanitize(val)
  })

  return result as unknown as T
}
