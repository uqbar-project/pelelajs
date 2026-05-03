import { getRegisteredTags } from '../registry/componentRegistry'
import { t } from './i18n'

export const ELEMENT_SNIPPET_MAX_LENGTH = 100

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

export function extractElementSnippet(
  element: Element,
  maxLength = ELEMENT_SNIPPET_MAX_LENGTH,
): string {
  return element.outerHTML.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

export function unwrapTemplate(template: string): string {
  const trimmed = template.trim()
  const match = trimmed.match(/^<(pelela|component)\b[^>]*>([\s\S]*)<\/\1>$/i)
  if (!match) {
    throw new Error(t('errors.compiler.malformedTemplate', { template: trimmed }))
  }
  return match[2].trim()
}

/**
 * Filters elements to include only those that are direct children or descendants of the root.
 *
 * **Initialization Contract:**
 * - `getRegisteredTags()` is consulted on every call, so all components must be registered
 *   (via `defineComponent()`) before the setup/start phase.
 * - This ensures descendants of newly registered components are correctly filtered.
 *
 * **Dependency on start()/setup:**
 * - This helper depends on the component registry being fully populated before setup begins.
 * - See router.ts:44 for the analogous initialization contract in routing.
 *
 * **Lazy Registration Behavior:**
 * - If lazy component registration is implemented, this helper would need to be updated to
 *   handle dynamic registration during the filtering phase.
 *
 * **Architecture Invariance:**
 * - Any architectural changes to component registration must maintain this invariant or
 *   update both this helper and `getRegisteredTags()` accordingly.
 */
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

export function isPropertyOrNestedPath(property: string | symbol, root: string): boolean {
  return typeof property === 'string' && (property === root || property.startsWith(`${root}.`))
}

export function findAllElements(root: HTMLElement, selector: string): HTMLElement[] {
  return [
    ...(root.matches(selector) ? [root] : []),
    ...Array.from(root.querySelectorAll<HTMLElement>(selector)),
  ]
}
