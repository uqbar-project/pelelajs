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

/**
 * Converts a camelCase class name to kebab-case filename.
 * Example: Home -> home, UserProfile -> user-profile
 */
function camelToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/**
 * Infers the component name from a ViewModel constructor.
 * Uses the constructor name and converts it to kebab-case.
 */
export function inferComponentName(ctor: ViewModelConstructor): string {
  return camelToKebab(ctor.name)
}

/**
 * Automatically registers a component with its template.
 * The component class and template must be provided by the caller.
 *
 * @param ctor - The ViewModel constructor to register
 * @param template - The template string for the component
 * @throws RoutingError if registration fails
 */
export function autoRegisterComponent(ctor: ViewModelConstructor, template: string): void {
  const componentName = inferComponentName(ctor)
  defineComponent(componentName, ctor, template)
}
