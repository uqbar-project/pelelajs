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

/**
 * Returns the iteration scope registered for an extended view model, or null
 * when the view model was not created by a for-each. Bindings use it to decide
 * whether a method name is a for-each method call (valid) or a plain method
 * used as a property (invalid).
 */
export function getForEachScopeInfo(viewModel: object): ForEachScopeInfo | null {
  return scopeInfos.get(viewModel) ?? null
}

/**
 * Tells whether a name matches the iteration or index variable of any enclosing
 * for-each scope. Walk the scope chain because an inner template can reference
 * an outer loop variable, and data always wins over a same-named method.
 */
export function isForEachScopeVariable(viewModel: object, propertyName: string): boolean {
  const scopeInfo = scopeInfos.get(viewModel)
  if (!scopeInfo) return false
  if (isPropertyOrNestedPath(propertyName, scopeInfo.itemName)) return true
  if (scopeInfo.indexName !== null && isPropertyOrNestedPath(propertyName, scopeInfo.indexName)) {
    return true
  }
  return isForEachScopeVariable(scopeInfo.parentViewModel, propertyName)
}

/**
 * Unwraps nested for-each scopes up to the owning view model. Prototype
 * lookups (methods, getters) must run against the real view model because the
 * scope proxy does not forward them.
 */
export function resolveScopeRootViewModel(viewModel: object): object {
  const scopeInfo = scopeInfos.get(viewModel)
  return scopeInfo ? resolveScopeRootViewModel(scopeInfo.parentViewModel) : viewModel
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
