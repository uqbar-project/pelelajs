import type { BindingsCollection } from './types'

function isPropertyGetter(obj: any, propertyPath: string): boolean {
  const hasGetter = (currentObj: any, part: string): boolean => {
    let descriptor = Object.getOwnPropertyDescriptor(currentObj, part)

    if (!descriptor && currentObj.constructor && currentObj.constructor.prototype) {
      descriptor = Object.getOwnPropertyDescriptor(currentObj.constructor.prototype, part)
    }

    return !!descriptor?.get
  }

  return propertyPath.split('.').some((part) => {
    let currentObj = obj?.$raw ?? obj
    const inspectedObj = currentObj?.$raw ?? currentObj
    if (!inspectedObj || typeof inspectedObj !== 'object') return false

    if (hasGetter(inspectedObj, part)) return true

    currentObj = inspectedObj[part]
    return false
  })
}

export type FilteredBindings = {
  valueBindings: Array<any>
  contentBindings: Array<any>
  ifBindings: Array<any>
  classBindings: Array<any>
  styleBindings: Array<any>
  forEachBindings: Array<any>
}

export class DependencyTracker {
  private dependencies = new Map<any, Set<string>>()
  private getterBindings = new Set<any>()

  registerDependency(binding: any, propertyPath: string, viewModel?: any): void {
    if (!this.dependencies.has(binding)) {
      this.dependencies.set(binding, new Set())
    }
    this.dependencies.get(binding)!.add(propertyPath)

    if (viewModel && isPropertyGetter(viewModel, propertyPath)) {
      this.markAsGetterBinding(binding)
    }
  }

  markAsGetterBinding(binding: any): void {
    this.getterBindings.add(binding)
  }

  isGetterBinding(binding: any): boolean {
    return this.getterBindings.has(binding)
  }

  getDependentBindings(changedPath: string, allBindings: BindingsCollection): FilteredBindings {
    const bindingKeys = Object.keys(allBindings) as (keyof FilteredBindings)[]

    return bindingKeys.reduce((result, key) => {
      result[key] = allBindings[key].filter((binding) =>
        this.isAffectedByChange(binding, changedPath),
      )
      return result
    }, {} as FilteredBindings)
  }

  getDependentBindingsWithGetterSupport(
    changedPath: string,
    allBindings: BindingsCollection,
  ): FilteredBindings {
    const result = this.getDependentBindings(changedPath, allBindings)

    const addGetterBindings = (bindings: Array<any>, currentResult: Array<any>): Array<any> => {
      return [
        ...currentResult,
        ...bindings.filter(
          (binding) => !currentResult.includes(binding) && this.isGetterBinding(binding),
        ),
      ]
    }

    result.ifBindings = addGetterBindings(allBindings.ifBindings, result.ifBindings)
    result.classBindings = addGetterBindings(allBindings.classBindings, result.classBindings)
    result.styleBindings = addGetterBindings(allBindings.styleBindings, result.styleBindings)
    result.contentBindings = addGetterBindings(allBindings.contentBindings, result.contentBindings)

    return result
  }

  private isAffectedByChange(binding: any, changedPath: string): boolean {
    const bindingPaths = this.dependencies.get(binding)
    if (!bindingPaths) {
      return false
    }

    return Array.from(bindingPaths).some((bindingPath) =>
      this.pathMatches(bindingPath, changedPath),
    )
  }

  /**
   * Determina si un binding debe actualizarse cuando cambia una propiedad.
   *
   * Casos considerados:
   * - Match exacto: "user.name" === "user.name"
   * - Propiedad anidada del cambio: "prueba.nombre" cuando cambió "prueba"
   * - Propiedad padre del cambio: "prueba" cuando cambió "prueba.nombre"
   */
  private pathMatches(bindingPath: string, changedPath: string): boolean {
    return (
      bindingPath === changedPath ||
      bindingPath.startsWith(`${changedPath}.`) ||
      changedPath.startsWith(`${bindingPath}.`)
    )
  }
}
