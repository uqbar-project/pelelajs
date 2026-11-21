import { isObject } from '../commons/helpers'
import { unwrapReactive } from '../reactivity/proxyIdentity'
import type { BindingsCollection } from './types'

function isPropertyGetter(obj: unknown, propertyPath: string): boolean {
  const hasGetter = (target: unknown, part: string): boolean => {
    if (!isObject(target)) return false

    let proto = target
    while (proto) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, part)
      if (descriptor?.get) {
        return true
      }
      proto = Object.getPrototypeOf(proto)
    }

    return false
  }

  let currentObj: unknown = obj

  return propertyPath.split('.').some((part) => {
    if (!isObject(currentObj)) return false
    const rawObj = unwrapReactive(currentObj)
    if (!isObject(rawObj)) return false
    if (hasGetter(rawObj, part)) return true

    currentObj = (rawObj as Record<string, unknown>)[part]
    return false
  })
}

type Binding = BindingsCollection[keyof BindingsCollection][number]

export class DependencyTracker {
  private dependencies = new Map<Binding, Set<string>>()
  private getterBindings = new Set<Binding>()

  registerDependency(binding: Binding, propertyPath: string, viewModel?: unknown): void {
    if (!this.dependencies.has(binding)) {
      this.dependencies.set(binding, new Set())
    }
    this.dependencies.get(binding)!.add(propertyPath)

    if (viewModel && isPropertyGetter(viewModel, propertyPath)) {
      this.markAsGetterBinding(binding)
    }
  }

  markAsGetterBinding(binding: Binding): void {
    this.getterBindings.add(binding)
  }

  isGetterBinding(binding: Binding): boolean {
    return this.getterBindings.has(binding)
  }

  getDependentBindings(changedPath: string, allBindings: BindingsCollection): BindingsCollection {
    const bindingKeys = Object.keys(allBindings) as (keyof BindingsCollection)[]

    return bindingKeys.reduce((result, key) => {
      // Use unknown as bridge to avoid any
      const bindings = allBindings[key] as unknown as Binding[]
      // @ts-expect-error - dynamic key access in a Typed object
      result[key] = bindings.filter((binding) => this.isAffectedByChange(binding, changedPath))
      return result
    }, {} as BindingsCollection)
  }

  getDependentBindingsWithGetterSupport(
    changedPath: string,
    allBindings: BindingsCollection,
  ): BindingsCollection {
    const result = this.getDependentBindings(changedPath, allBindings)

    const addGetterBindings = <T extends object>(
      bindings: Array<T>,
      currentResult: Array<T>,
    ): Array<T> => [
      ...currentResult,
      ...bindings.filter(
        (binding) =>
          !currentResult.includes(binding) && this.isGetterBinding(binding as unknown as Binding),
      ),
    ]

    return {
      ...result,
      ifBindings: addGetterBindings(allBindings.ifBindings, result.ifBindings),
      classBindings: addGetterBindings(allBindings.classBindings, result.classBindings),
      styleBindings: addGetterBindings(allBindings.styleBindings, result.styleBindings),
      contentBindings: addGetterBindings(allBindings.contentBindings, result.contentBindings),
      forEachBindings: addGetterBindings(allBindings.forEachBindings, result.forEachBindings),
      componentBindings: addGetterBindings(allBindings.componentBindings, result.componentBindings),
      valueBindings: addGetterBindings(allBindings.valueBindings, result.valueBindings),
      altBindings: addGetterBindings(allBindings.altBindings, result.altBindings),
      enabledBindings: addGetterBindings(allBindings.enabledBindings, result.enabledBindings),
    }
  }

  private isAffectedByChange(binding: Binding, changedPath: string): boolean {
    const bindingPaths = this.dependencies.get(binding)
    if (!bindingPaths) {
      return false
    }

    return Array.from(bindingPaths).some((bindingPath) =>
      this.pathMatches(bindingPath, changedPath),
    )
  }

  /**
   * Determines whether a binding must update when a property changes.
   *
   * Cases considered:
   * - Exact match: "user.name" === "user.name"
   * - Nested property of the change: "user.name" when "user" changed
   * - Parent property of the change: "user" when "user.name" changed
   */
  private pathMatches(bindingPath: string, changedPath: string): boolean {
    return (
      bindingPath === changedPath ||
      bindingPath.startsWith(`${changedPath}.`) ||
      changedPath.startsWith(`${bindingPath}.`)
    )
  }
}
