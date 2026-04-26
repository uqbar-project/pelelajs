import { toKebabCase } from '../commons/helpers'
import type { ViewModelConstructor } from '../types'
import { getViewModel, registerViewModel, replaceViewModel } from './viewModelRegistry'

type ComponentEntry = {
  name: string
  template: string
}

const templatesByConstructor = new Map<ViewModelConstructor, ComponentEntry>()
const componentsByTag = new Map<string, { creator: ViewModelConstructor; entry: ComponentEntry }>()

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
  const entry = { name, template }
  templatesByConstructor.set(creator, entry)
  const tag = toKebabCase(name)
  componentsByTag.set(tag, { creator, entry })
}

export function getComponentEntry(creator: ViewModelConstructor): ComponentEntry | undefined {
  return templatesByConstructor.get(creator)
}

export function getComponentByTag(
  tag: string,
): { creator: ViewModelConstructor; entry: ComponentEntry } | undefined {
  return componentsByTag.get(tag)
}

export function getRegisteredTags(): string[] {
  return Array.from(componentsByTag.keys())
}

export function clearComponentRegistry(): void {
  templatesByConstructor.clear()
  componentsByTag.clear()
}
