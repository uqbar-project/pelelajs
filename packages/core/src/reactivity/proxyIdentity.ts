/**
 * Identity of the reactive proxies created by makeReactive.
 *
 * Kept dependency-free so that lower-level modules (e.g. commons/helpers) can
 * recognize a reactive proxy without importing the reactivity implementation,
 * which would create a circular dependency (reactiveProxy imports isObject).
 */
const rawObjectCache = new WeakMap<object, object>()

export function registerReactiveProxy(proxy: object, rawTarget: object): void {
  rawObjectCache.set(proxy, rawTarget)
}

/**
 * Checks if a value is a reactive proxy.
 */
export function isProxy(value: unknown): boolean {
  return isObjectLike(value) && rawObjectCache.has(value)
}

function isObjectLike(value: unknown): value is object {
  return value !== null && typeof value === 'object'
}

/**
 * Loose shape of any value that may be a reactive proxy exposing its raw
 * target through `$raw`. Used by `unwrapReactive`.
 */
export type ViewModelWithRaw = { $raw?: unknown }

/**
 * Returns the raw target when `value` is a reactive proxy, or `value` itself
 * otherwise. Plain objects declaring an own `$raw` property are left untouched
 * so the reactive sentinel is never confused with user data.
 */
export function unwrapReactive(value: unknown): unknown {
  if (!isProxy(value)) return value
  return (value as ViewModelWithRaw).$raw ?? value
}
