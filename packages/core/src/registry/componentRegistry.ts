import type { ViewModelConstructor } from '../types'
import { getViewModel, registerViewModel, replaceViewModel } from './viewModelRegistry'

type ComponentEntry = {
  name: string
  template: string
}

const templatesByConstructor = new Map<ViewModelConstructor, ComponentEntry>()
const componentsByTag = new Map<string, { ctor: ViewModelConstructor; entry: ComponentEntry }>()

function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Registers a ViewModel with its associated template for routing.
 * Combines ViewModel registration with template association in a single call.
 * Safe for HMR: overwrites existing registration with a warning.
 */
export function defineComponent(name: string, ctor: ViewModelConstructor, template: string): void {
  const existingCtor = getViewModel(name)

  if (existingCtor && existingCtor !== ctor) {
    console.warn(`[pelela] Component "${name}" re-evaluated. Replacing old constructor.`)
    templatesByConstructor.delete(existingCtor)
    replaceViewModel(name, ctor)
  } else if (!existingCtor) {
    registerViewModel(name, ctor)
  }

  const entry = { name, template }
  templatesByConstructor.set(ctor, entry)

  const tag = toKebabCase(name)
  componentsByTag.set(tag, { ctor, entry })
}

export function getComponentEntry(ctor: ViewModelConstructor): ComponentEntry | undefined {
  return templatesByConstructor.get(ctor)
}

export function getComponentByTag(
  tag: string,
): { ctor: ViewModelConstructor; entry: ComponentEntry } | undefined {
  return componentsByTag.get(tag)
}

export function getRegisteredTags(): string[] {
  return Array.from(componentsByTag.keys())
}

export function clearComponentRegistry(): void {
  templatesByConstructor.clear()
  componentsByTag.clear()
}
