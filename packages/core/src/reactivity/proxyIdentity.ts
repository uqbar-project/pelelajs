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
 * Retrieves the raw object behind a reactive proxy, walking the chain
 * of nested proxies until the original object is found.
 */
export function getRawObject(value: object): object {
  const rawObject = rawObjectCache.get(value)
  return rawObject ? getRawObject(rawObject) : value
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
