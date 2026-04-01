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
 * Caches to keep track of proxies and their original objects.
 * This prevents creating multiple proxies for the same object and
 * allows retrieving the raw object from a proxy.
 */
const proxyCache = new WeakMap<object, object>()
const rawObjectCache = new WeakMap<object, object>()

/**
 * Handler for the reactive proxy.
 * Encapsulates the logic for getting, setting, and deleting properties
 * while maintaining deep reactivity and change tracking.
 */
class ReactiveHandler<T extends object> implements ProxyHandler<T> {
  constructor(
    private readonly onChange: (changedPath: string) => void,
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
      return makeReactive(value, this.onChange, new WeakSet([targetObject]), childPath)
    }

    return value
  }

  set(targetObject: T, propertyKey: string | symbol, value: unknown, receiver: unknown): boolean {
    const oldValue = Reflect.get(targetObject, propertyKey, receiver)

    if (oldValue === value) {
      return true
    }

    const result = Reflect.set(targetObject, propertyKey, value, receiver)

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
        Reflect.set(target, key, value)
        return
      }

      const result = Reflect.set(target, key, value)

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
      const method = Array.prototype[methodName] as (...args: unknown[]) => unknown
      const result = method.apply(targetArray, args)
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
 * - proxyCache: To avoid creating redundant proxies for the same object.
 * - rawObjectCache: To map proxies back to their original objects if needed.
 * - visited: To handle circular references and prevent infinite recursion.
 */
function makeReactive<T>(
  target: T,
  onChange: (changedPath: string) => void,
  visited = new WeakSet<object>(),
  parentPath = '',
): T {
  if (!isObject(target)) {
    return target
  }

  const existingProxy = proxyCache.get(target) as T | undefined
  if (existingProxy) {
    return existingProxy
  }

  if (visited.has(target)) {
    return target
  }

  visited.add(target)

  const handler = new ReactiveHandler<object>(onChange, parentPath)
  const proxy = new Proxy(target, handler) as T & object

  proxyCache.set(target, proxy)
  rawObjectCache.set(proxy, target)

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
  return makeReactive(target, onChange) as ReactiveViewModel<T>
}
