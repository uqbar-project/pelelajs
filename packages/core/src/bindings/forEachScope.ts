import { isPropertyOrNestedPath } from '../commons/helpers'
import { isUnsafeKey } from '../commons/sanitization'
import { getNestedProperty } from './nestedProperties'

/**
 * The `for-each` scope resolves handler names through its own proxy, so the
 * receiver an event handler runs with is not the view model: it is the object
 * that actually owns the accessed member. Registering the scope here lets
 * `executeEventHandler` ask that question instead of assuming the view model.
 */
export interface ForEachScopeInfo {
  readonly parentViewModel: object
  readonly itemName: string
  readonly indexName: string | null
  readonly itemRef: { current: unknown }
  readonly indexRef: { current: number }
}

export interface ResolvedHandlerOwner {
  readonly owner: object
  readonly memberName: string
}

const scopeInfos = new WeakMap<object, ForEachScopeInfo>()

export function registerForEachScope(scope: object, info: ForEachScopeInfo): void {
  scopeInfos.set(scope, info)
}

function walkNestedOwner(base: unknown, segments: string[]): object | null {
  let current: unknown = base
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return null
    current = getNestedProperty(current, segment)
  }
  return current !== null && typeof current === 'object' ? (current as object) : null
}

/**
 * Resolves which object owns the last member of a handler name inside a
 * `for-each` scope, so `link.navigate` is validated and invoked against the
 * `link` item rather than the scope proxy. Returns `null` for handlers that do
 * not target the iterated item (view model members, and the index variable).
 */
export function resolveHandlerOwner(
  viewModel: object,
  handlerName: string,
): ResolvedHandlerOwner | null {
  if (isUnsafeKey(handlerName)) return null
  const info = scopeInfos.get(viewModel)
  if (!info) return null
  if (!isPropertyOrNestedPath(handlerName, info.itemName)) return null

  const nestedPath = handlerName.slice(info.itemName.length + 1)
  const segments = nestedPath.split('.')
  if (segments.some((segment) => isUnsafeKey(segment))) return null

  const memberName = segments.pop() as string
  if (segments.length === 0) {
    const item = info.itemRef.current
    return item !== null && typeof item === 'object' ? { owner: item, memberName } : null
  }

  const owner = walkNestedOwner(info.itemRef.current, segments)
  return owner === null ? null : { owner, memberName }
}
