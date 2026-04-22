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
  const componentSelector = ['[view-model]', ...registeredTags].join(',')

  return Array.from(elements).filter((element) => {
    let parent = element.parentElement
    while (parent && parent !== root) {
      if (parent.matches(componentSelector)) {
        return false
      }
      parent = parent.parentElement
    }
    return true
  })
}

export function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())
}
