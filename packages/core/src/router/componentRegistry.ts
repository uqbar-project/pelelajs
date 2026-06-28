import {
  clearComponentRegistry,
  defineComponent as defineComponentOriginal,
  getComponentEntry,
} from '../registry/componentRegistry'
import { toKebabCase } from '../commons/helpers'
import type { ViewModelConstructor } from '../types'

export function inferComponentName(creator: ViewModelConstructor): string {
  return toKebabCase(creator.name)
}

export function autoRegisterComponent(creator: ViewModelConstructor, template: string): void {
  const componentName = inferComponentName(creator)
  defineComponentOriginal(componentName, creator, template)
}

export { defineComponentOriginal as defineComponent, getComponentEntry, clearComponentRegistry }
