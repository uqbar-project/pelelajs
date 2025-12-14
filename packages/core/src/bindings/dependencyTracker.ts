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

    if (descriptor && descriptor.get) {
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

  getDependentBindings(changedPath: string, allBindings: BindingsCollection): FilteredBindings {
    const result: FilteredBindings = {
      valueBindings: [],
      contentBindings: [],
      ifBindings: [],
      classBindings: [],
      styleBindings: [],
      forEachBindings: [],
    }

    for (const binding of allBindings.valueBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.valueBindings.push(binding)
      }
    }

    for (const binding of allBindings.contentBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.contentBindings.push(binding)
      }
    }

    for (const binding of allBindings.ifBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.ifBindings.push(binding)
      }
    }

    for (const binding of allBindings.classBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.classBindings.push(binding)
      }
    }

    for (const binding of allBindings.styleBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.styleBindings.push(binding)
      }
    }

    for (const binding of allBindings.forEachBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.forEachBindings.push(binding)
      }
    }

    return result
  }

  getDependentBindingsWithGetterSupport(
    changedPath: string,
    allBindings: BindingsCollection,
  ): FilteredBindings {
    const result = this.getDependentBindings(changedPath, allBindings)

    for (const binding of allBindings.ifBindings) {
      if (!result.ifBindings.includes(binding) && this.isGetterBinding(binding)) {
        result.ifBindings.push(binding)
      }
    }

    for (const binding of allBindings.classBindings) {
      if (!result.classBindings.includes(binding) && this.isGetterBinding(binding)) {
        result.classBindings.push(binding)
      }
    }

    for (const binding of allBindings.styleBindings) {
      if (!result.styleBindings.includes(binding) && this.isGetterBinding(binding)) {
        result.styleBindings.push(binding)
      }
    }

    for (const binding of allBindings.contentBindings) {
      if (!result.contentBindings.includes(binding) && this.isGetterBinding(binding)) {
        result.contentBindings.push(binding)
      }
    }

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
