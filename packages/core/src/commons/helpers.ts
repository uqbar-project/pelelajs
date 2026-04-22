import { getRegisteredTags } from '../registry/componentRegistry'

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

export function extractElementSnippet(element: Element, maxLength = 100): string {
  return element.outerHTML.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

export function unwrapTemplate(template: string): string {
  const match = template
    .trim()
    .match(/^<(?:pelela|component)\b[^>]*>([\s\S]*)<\/(?:pelela|component)>$/i)
  return match ? match[1].trim() : template
}

export function filterOwnElements(
  elements: NodeListOf<HTMLElement> | HTMLElement[],
  root: HTMLElement,
): HTMLElement[] {
  const registeredTags = getRegisteredTags()
  const selector = ['[view-model]', ...registeredTags].join(',')
  return Array.from(elements).filter((element) => {
    const nearest = element.parentElement?.closest(selector)
    return nearest === root || !nearest
  })
}

export function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())
}

export function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

export function isNestedPropertyPath(property: string | symbol, root: string): boolean {
  return typeof property === 'string' && (property === root || property.startsWith(`${root}.`))
}
