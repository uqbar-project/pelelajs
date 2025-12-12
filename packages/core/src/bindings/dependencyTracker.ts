import type { BindingsCollection } from "./types";

export type FilteredBindings = {
  valueBindings: Array<any>;
  ifBindings: Array<any>;
  classBindings: Array<any>;
  styleBindings: Array<any>;
  forEachBindings: Array<any>;
};

export class DependencyTracker {
  private dependencies = new Map<any, Set<string>>();

  registerDependency(binding: any, propertyPath: string): void {
    if (!this.dependencies.has(binding)) {
      this.dependencies.set(binding, new Set());
    }
    this.dependencies.get(binding)!.add(propertyPath);
  }

  getDependentBindings(
    changedPath: string,
    allBindings: BindingsCollection,
  ): FilteredBindings {
    const result: FilteredBindings = {
      valueBindings: [],
      ifBindings: [],
      classBindings: [],
      styleBindings: [],
      forEachBindings: [],
    };

    for (const binding of allBindings.valueBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.valueBindings.push(binding);
      }
    }

    for (const binding of allBindings.ifBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.ifBindings.push(binding);
      }
    }

    for (const binding of allBindings.classBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.classBindings.push(binding);
      }
    }

    for (const binding of allBindings.styleBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.styleBindings.push(binding);
      }
    }

    for (const binding of allBindings.forEachBindings) {
      if (this.isAffectedByChange(binding, changedPath)) {
        result.forEachBindings.push(binding);
      }
    }

    return result;
  }

  private isAffectedByChange(binding: any, changedPath: string): boolean {
    const bindingPaths = this.dependencies.get(binding);
    if (!bindingPaths) {
      return false;
    }

    for (const bindingPath of bindingPaths) {
      if (this.pathMatches(bindingPath, changedPath)) {
        return true;
      }
    }

    return false;
  }

  private pathMatches(bindingPath: string, changedPath: string): boolean {
    // Caso 1: Match exacto
    if (bindingPath === changedPath) {
      return true;
    }

    // Caso 2: El binding depende de una propiedad anidada del cambio
    // Ejemplo: cambió "prueba", el binding usa "prueba.nombre" → debe re-renderizar
    if (bindingPath.startsWith(`${changedPath}.`)) {
      return true;
    }

    // Caso 3: Cambió una propiedad anidada, el binding depende del padre
    // Ejemplo: cambió "prueba.nombre", el binding usa "prueba" → debe re-renderizar
    if (changedPath.startsWith(`${bindingPath}.`)) {
      return true;
    }

    return false;
  }
}

