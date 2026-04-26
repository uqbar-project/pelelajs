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
export function defineComponent(
  name: string,
  creator: ViewModelConstructor,
  template: string,
): void {
  const existingCreator = getViewModel(name)

  if (existingCreator && existingCreator !== creator) {
    console.warn(`[pelela] Component "${name}" re-evaluated. Replacing old constructor.`)
    templatesByConstructor.delete(existingCreator)
    replaceViewModel(name, creator)
  } else if (!existingCreator) {
    registerViewModel(name, creator)
  }

  templatesByConstructor.set(creator, { name, template })
}

export function getComponentEntry(creator: ViewModelConstructor): ComponentEntry | undefined {
  return templatesByConstructor.get(creator)
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
export function inferComponentName(creator: ViewModelConstructor): string {
  return camelToKebab(creator.name)
}

/**
 * Automatically registers a component with its template.
 * The component class and template must be provided by the caller.
 *
 * @param creator - The ViewModel constructor to register
 * @param template - The template string for the component
 * @throws RoutingError if registration fails
 */
export function autoRegisterComponent(creator: ViewModelConstructor, template: string): void {
  const componentName = inferComponentName(creator)
  defineComponent(componentName, creator, template)
}
