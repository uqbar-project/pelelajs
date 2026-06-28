import {
  clearComponentRegistry,
  defineComponent as defineComponentOriginal,
  getComponentEntry,
} from '../registry/componentRegistry'
import type { ViewModelConstructor } from '../types'

function camelToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

export function inferComponentName(creator: ViewModelConstructor): string {
  return camelToKebab(creator.name)
}

export function autoRegisterComponent(creator: ViewModelConstructor, template: string): void {
  const componentName = inferComponentName(creator)
  defineComponentOriginal(componentName, creator, template)
}

export { defineComponentOriginal as defineComponent, getComponentEntry, clearComponentRegistry }
