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
