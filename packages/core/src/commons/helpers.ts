import { isProxy } from '../reactivity/proxyIdentity'
import { getRegisteredTags } from '../registry/componentRegistry'
import { t } from './i18n'
import { isUnsafeKey } from './sanitization'

export const ELEMENT_SNIPPET_MAX_LENGTH = 100

export const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/

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
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

export function findUniqueCollapsedTag(
  tagName: string,
  candidateTags: string[],
): string | undefined {
  const matchingTags = candidateTags.filter(
    (candidateTag) => candidateTag.replace(/-/g, '') === tagName,
  )

  return matchingTags.length === 1 ? matchingTags[0] : undefined
}

export function isPropertyOrNestedPath(property: string | symbol, root: string): boolean {
  return typeof property === 'string' && (property === root || property.startsWith(`${root}.`))
}

export function findAllElements(
  root: HTMLElement,
  selector: string,
  includeRoot = true,
): HTMLElement[] {
  return [
    ...(includeRoot && root.matches(selector) ? [root] : []),
    ...Array.from(root.querySelectorAll<HTMLElement>(selector)),
  ]
}

export function isValidIdentifier(value: string): boolean {
  return IDENTIFIER_PATTERN.test(value) && !isUnsafeKey(value)
}

interface ViewModelWithRaw {
  $raw?: unknown
}

/**
 * Looks up a member of the view model (or its prototype chain) whose name matches
 * the given name ignoring case. Used to suggest the real member when a binding or
 * event references a wrongly-cased name. Returns `null` when there is no match.
 */
export function findCaseInsensitiveMember(target: object, name: string): string | null {
  if (isUnsafeKey(name)) return null

  const viewModel: unknown = (target as ViewModelWithRaw).$raw ?? target
  if (!isObject(viewModel)) return null

  let proto: object | null = viewModel
  while (proto !== null && proto !== Object.prototype) {
    const match = Object.getOwnPropertyNames(proto).find(
      (memberName) => !isUnsafeKey(memberName) && memberName.toLowerCase() === name.toLowerCase(),
    )
    if (match) return match
    proto = Reflect.getPrototypeOf(proto)
  }
  return null
}

/**
 * Detects whether a member of the view model is declared as an arrow function
 * field (e.g. `increment = () => {}`). Arrow functions are not allowed as view
 * model members: they bind `this` lexically and cannot use the view model as
 * context.
 *
 * The signal is unambiguous for class instances (the only valid view models):
 * class methods live on the prototype, so an own property whose value is a
 * function without a `prototype` (arrows are not constructible) can only be an
 * arrow function field.
 */
export function isArrowFunctionMember(
  viewModel: object,
  memberName: string,
  value: unknown,
): boolean {
  if (isUnsafeKey(memberName)) return false
  const rawViewModel: unknown = isProxy(viewModel)
    ? ((viewModel as ViewModelWithRaw).$raw ?? viewModel)
    : viewModel
  return isObject(rawViewModel) && Object.hasOwn(rawViewModel, memberName) && isArrowFunction(value)
}

function isArrowFunction(value: unknown): boolean {
  if (typeof value !== 'function' || value.prototype !== undefined) {
    return false
  }

  return !isAsyncFunction(value) && !isConstructableFunction(value)
}

/**
 * Async functions share the prototype-less shape of arrows (both have an
 * undefined .prototype), but they are not arrow functions, so they are
 * classified as generic functions instead.
 */
function isAsyncFunction(value: unknown): boolean {
  return typeof value === 'function' && value.constructor.name === 'AsyncFunction'
}

/**
 * Bound functions also lose their .prototype, yet unlike arrows they remain
 * constructable. Probing constructability is the only side-effect-free way to
 * tell them apart, so the construction failure here is meaningful, not an
 * error to swallow silently.
 */
function isConstructableFunction(value: unknown): boolean {
  if (typeof value !== 'function') {
    return false
  }

  try {
    Reflect.construct(Object, [], value)
    return true
  } catch {
    return false
  }
}
