import { getViewModel, registerViewModel } from '../registry/viewModelRegistry'
import type { ViewModelConstructor } from '../types'

type ComponentEntry = {
  name: string
  template: string
}

const templatesByConstructor = new Map<ViewModelConstructor, ComponentEntry>()

/**
 * Registers a ViewModel with its associated template for routing.
 * Combines ViewModel registration with template association in a single call.
 * Idempotent when called with the same name and constructor.
 */
export function defineComponent(name: string, ctor: ViewModelConstructor, template: string): void {
  const existingCtor = getViewModel(name)

  if (existingCtor && existingCtor !== ctor) {
    // A different constructor is already registered under this name
    registerViewModel(name, ctor) // will throw ViewModelRegistrationError('duplicate')
  }

  if (!existingCtor) {
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
