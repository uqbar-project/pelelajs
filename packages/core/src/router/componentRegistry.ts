import { getViewModel, registerViewModel, replaceViewModel } from '../registry/viewModelRegistry'
import type { ViewModelConstructor } from '../types'

type ComponentEntry = {
  name: string
  template: string
}

const templatesByConstructor = new Map<ViewModelConstructor, ComponentEntry>()

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

  templatesByConstructor.set(ctor, { name, template })
}

export function getComponentEntry(ctor: ViewModelConstructor): ComponentEntry | undefined {
  return templatesByConstructor.get(ctor)
}

export function clearComponentRegistry(): void {
  templatesByConstructor.clear()
}
