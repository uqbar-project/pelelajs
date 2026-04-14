/**
 * Utilities for sanitizing and escaping untrusted content
 * before injecting it into the DOM or other sensitive contexts
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
  return sanitizeInternal(value, new WeakSet()) as T
}

function sanitizeInternal(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return escapeHTML(value)
  if (value === null || typeof value !== 'object') return value

  if (seen.has(value)) {
    throw new TypeError('Cannot sanitize circular references')
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInternal(item, seen))
  }

  const result = {} as Record<string, unknown>
  Object.entries(value).forEach(([key, val]) => {
    result[key] = sanitizeInternal(val, seen)
  })
  return result
}
