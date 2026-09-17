import { isObject } from '../commons/helpers'

const ARRAY_MUTATION_METHODS = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
] as const

/**
 * Keeps track of each proxy's original object so proxies can be unwrapped
 * when values move between reactive view model contexts.
 */
const rawObjectCache = new WeakMap<object, object>()
type ReactiveProxyCache = WeakMap<object, object>

function getRawObject(value: object): object {
  const rawObject = rawObjectCache.get(value)
  return rawObject ? getRawObject(rawObject) : value
}

function getRawValue<T>(value: T): T {
  return isObject(value) ? (getRawObject(value) as T) : value
}

/**
 * Handler for the reactive proxy.
 * Encapsulates the logic for getting, setting, and deleting properties
 * while maintaining deep reactivity and change tracking.
 */
class ReactiveHandler<T extends object> implements ProxyHandler<T> {
  constructor(
    private readonly onChange: (changedPath: string) => void,
    private readonly proxyCache: ReactiveProxyCache,
    private readonly parentPath = '',
  ) {}

  get(targetObject: T, propertyKey: string | symbol, receiver: unknown): unknown {
    if (propertyKey === '$raw') {
      return targetObject
    }

    if (propertyKey === '$set') {
      return this.handleSetHelper()
    }

    if (propertyKey === '$delete') {
      return this.handleDeleteHelper()
    }

    const value = Reflect.get(targetObject, propertyKey, receiver)

    if (Array.isArray(targetObject) && this.isArrayMutationMethod(propertyKey)) {
      return this.handleArrayMutation(targetObject, propertyKey)
    }

    // Deep reactivity: if the value is an object, wrap it in a proxy.
    if (isObject(value)) {
      const childPath = this.buildPath(String(propertyKey))
      return makeReactive(
        value,
        this.onChange,
        this.proxyCache,
        new WeakSet([targetObject]),
        childPath,
      )
    }

    return value
  }

  set(targetObject: T, propertyKey: string | symbol, value: unknown, receiver: unknown): boolean {
    const oldValue = Reflect.get(targetObject, propertyKey, receiver)
    const rawValue = getRawValue(value)

    // Always notify for array property assignments (like .length) to catch in-place mutations
    const isArrayMutation =
      Array.isArray(targetObject) &&
      (propertyKey === 'length' || (typeof propertyKey === 'string' && /^\d+$/.test(propertyKey)))
    if (!isArrayMutation && getRawValue(oldValue) === rawValue) {
      return true
    }

    const result = Reflect.set(targetObject, propertyKey, rawValue, receiver)

    if (result) {
      this.notifyChange(propertyKey)
    }

    return result
  }

  deleteProperty(targetObject: T, propertyKey: string | symbol): boolean {
    const hadProperty = Reflect.has(targetObject, propertyKey)
    const result = Reflect.deleteProperty(targetObject, propertyKey)

    if (result && hadProperty) {
      this.notifyChange(propertyKey)
    }

    return result
  }

  /**
   * Builds a full path string for nested properties.
   */
  private buildPath(property: string): string {
    return this.parentPath ? `${this.parentPath}.${property}` : property
  }

  private isArrayMutationMethod(
    propertyKey: PropertyKey,
  ): propertyKey is (typeof ARRAY_MUTATION_METHODS)[number] {
    return (
      typeof propertyKey === 'string' &&
      (ARRAY_MUTATION_METHODS as readonly string[]).includes(propertyKey)
    )
  }

  private notifyChange(propertyKey: PropertyKey): void {
    const fullPath = this.buildPath(String(propertyKey))
    this.onChange(fullPath)
  }

  private handleSetHelper(): (target: object, key: PropertyKey, value: unknown) => void {
    return (target: object, key: PropertyKey, value: unknown) => {
      if (isProxy(target)) {
        Reflect.set(target, key, getRawValue(value))
        return
      }

      const result = Reflect.set(target, key, getRawValue(value))

      if (result) {
        this.notifyChange(key)
      }
    }
  }

  private handleDeleteHelper(): (target: object, key: PropertyKey) => void {
    return (target: object, key: PropertyKey) => {
      if (isProxy(target)) {
        Reflect.deleteProperty(target, key)
        return
      }

      const result = Reflect.deleteProperty(target, key)

      if (result) {
        this.notifyChange(key)
      }
    }
  }

  /**
   * Wraps array mutation methods to track changes and make new elements reactive.
   */
  private handleArrayMutation<V>(
    targetArray: V[],
    methodName: (typeof ARRAY_MUTATION_METHODS)[number],
  ): (...args: unknown[]) => unknown {
    return (...args: unknown[]) => {
      const method = Array.prototype[methodName] as (...methodArgs: unknown[]) => unknown
      const result = method.apply(targetArray, args.map(getRawValue))
      this.onChange(this.parentPath || 'root')
      return result
    }
  }
}

/**
 * Checks if a value is a reactive proxy.
 */
export function isProxy(value: unknown): boolean {
  return isObject(value) && rawObjectCache.has(value)
}

/**
 * Creates a reactive proxy for the given target object.
 *
 * Why we use WeakMap/WeakSet:
 * - proxyCache: To avoid creating redundant proxies within one reactive context.
 * - rawObjectCache: To unwrap proxies when values cross reactive contexts.
 * - visited: To handle circular references and prevent infinite recursion.
 */
function makeReactive<T>(
  target: T,
  onChange: (changedPath: string) => void,
  proxyCache: ReactiveProxyCache,
  visited = new WeakSet<object>(),
  parentPath = '',
): T {
  if (!isObject(target)) {
    return target
  }

  const rawTarget = getRawValue(target)

  const existingProxy = proxyCache.get(rawTarget as object) as T | undefined
  if (existingProxy) {
    return existingProxy
  }

  if (visited.has(rawTarget as object)) {
    return rawTarget
  }

  visited.add(rawTarget as object)

  const handler = new ReactiveHandler<object>(onChange, proxyCache, parentPath)
  const proxy = new Proxy(rawTarget, handler) as T & object

  proxyCache.set(rawTarget as object, proxy)
  rawObjectCache.set(proxy, rawTarget as object)

  return proxy as T
}

export type ReactiveViewModel<T extends object> = T & {
  $raw: T
  $set: (target: object, key: PropertyKey, value: unknown) => void
  $delete: (target: object, key: PropertyKey) => void
}

export function createReactiveViewModel<T extends object>(
  target: T,
  onChange: (changedPath: string) => void,
): ReactiveViewModel<T> {
  const proxyCache: ReactiveProxyCache = new WeakMap<object, object>()
  return makeReactive(target, onChange, proxyCache) as ReactiveViewModel<T>
}
