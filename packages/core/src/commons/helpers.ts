export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

export function extractElementSnippet(element: Element, maxLength = 100): string {
  return element.outerHTML.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}
