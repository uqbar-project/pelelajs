import type { BindingsCollection } from './types'

function isPropertyGetter(obj: any, propertyPath: string): boolean {
  const rawObj = obj?.$raw || obj
  const parts = propertyPath.split('.')
  let current = rawObj

  for (let i = 0; i < parts.length; i++) {
    if (!current || typeof current !== 'object') return false

    const part = parts[i]

    let descriptor = Object.getOwnPropertyDescriptor(current, part)

    if (!descriptor && current.constructor && current.constructor.prototype) {
      descriptor = Object.getOwnPropertyDescriptor(current.constructor.prototype, part)
    }

    if (descriptor?.get) {
      return true
    }

    current = current[part]
  }

  return false
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

  private filterAffected<T>(bindings: T[], changedPath: string): T[] {
    return bindings.filter((b) => this.isAffectedByChange(b, changedPath))
  }

  getDependentBindings(changedPath: string, allBindings: BindingsCollection): FilteredBindings {
    return {
      valueBindings: this.filterAffected(allBindings.valueBindings, changedPath),
      contentBindings: this.filterAffected(allBindings.contentBindings, changedPath),
      ifBindings: this.filterAffected(allBindings.ifBindings, changedPath),
      classBindings: this.filterAffected(allBindings.classBindings, changedPath),
      styleBindings: this.filterAffected(allBindings.styleBindings, changedPath),
      forEachBindings: this.filterAffected(allBindings.forEachBindings, changedPath),
    }
  }

  private appendGetterBindings<T>(resultList: T[], allBindings: T[]): void {
    for (const binding of allBindings) {
      if (!resultList.includes(binding) && this.isGetterBinding(binding)) {
        resultList.push(binding)
      }
    }
  }

  getDependentBindingsWithGetterSupport(
    changedPath: string,
    allBindings: BindingsCollection,
  ): FilteredBindings {
    const result = this.getDependentBindings(changedPath, allBindings)
    this.appendGetterBindings(result.ifBindings, allBindings.ifBindings)
    this.appendGetterBindings(result.classBindings, allBindings.classBindings)
    this.appendGetterBindings(result.styleBindings, allBindings.styleBindings)
    this.appendGetterBindings(result.contentBindings, allBindings.contentBindings)
    return result
  }

  private isAffectedByChange(binding: any, changedPath: string): boolean {
    const bindingPaths = this.dependencies.get(binding)
    if (!bindingPaths) {
      return false
    }

    for (const bindingPath of bindingPaths) {
      if (this.pathMatches(bindingPath, changedPath)) {
        return true
      }
    }

    return false
  }

  private pathMatches(bindingPath: string, changedPath: string): boolean {
    // Caso 1: Match exacto
    if (bindingPath === changedPath) {
      return true
    }

    // Caso 2: El binding depende de una propiedad anidada del cambio
    // Ejemplo: cambió "prueba", el binding usa "prueba.nombre" → debe re-renderizar
    if (bindingPath.startsWith(`${changedPath}.`)) {
      return true
    }

    // Caso 3: Cambió una propiedad anidada, el binding depende del padre
    // Ejemplo: cambió "prueba.nombre", el binding usa "prueba" → debe re-renderizar
    if (changedPath.startsWith(`${bindingPath}.`)) {
      return true
    }

    return false
  }
}
