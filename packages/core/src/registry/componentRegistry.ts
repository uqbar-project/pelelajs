import { toKebabCase } from '../commons/helpers'
import { ViewModelExportError } from '../errors/index'
import type { ViewModelConstructor } from '../types'
import { getViewModel, registerViewModel, replaceViewModel } from './viewModelRegistry'

type ComponentEntry = {
  name: string
  template: string
  cssUrls?: string[]
}

type DefineComponentOptions = {
  cssUrls?: string[]
}

const templatesByConstructor = new Map<ViewModelConstructor, ComponentEntry>()
const componentsByTag = new Map<string, { creator: ViewModelConstructor; entry: ComponentEntry }>()
const tagByCreator = new Map<ViewModelConstructor, string>()

function getNonClassDeclaredAs(creator: ViewModelConstructor): 'Object' | 'Function' | undefined {
  if (typeof creator !== 'function') {
    return 'Object'
  }
  if (/^\s*class\b/.test(Function.prototype.toString.call(creator))) {
    return undefined
  }
  return 'Function'
}

export function defineComponent(
  name: string,
  creator: ViewModelConstructor,
  template: string,
  options: DefineComponentOptions = {},
): void {
  const declaredAs = getNonClassDeclaredAs(creator)
  if (declaredAs !== undefined) {
    throw new ViewModelExportError({
      kind: 'notAClass',
      viewModelName: name,
      tsFilePath: 'runtime',
      declaredAs,
    })
  }
  const { cssUrls = [] } = options
  const existingCreator = getViewModel(name)
  if (existingCreator && existingCreator !== creator) {
    console.warn(`[pelela] Component "${name}" re-evaluated. Replacing old constructor.`)

    // Remove obsolete entries in componentsByTag pointing to existingConstructor
    for (const [registeredTag, value] of componentsByTag.entries()) {
      if (value.creator === existingCreator) {
        componentsByTag.delete(registeredTag)
      }
    }
    templatesByConstructor.delete(existingCreator)
    tagByCreator.delete(existingCreator)
    replaceViewModel(name, creator)
  } else if (!existingCreator) {
    registerViewModel(name, creator)
  }
  const entry = {
    name,
    template,
    ...(cssUrls.length > 0 && { cssUrls }),
  }
  templatesByConstructor.set(creator, entry)
  const tag = toKebabCase(name)
  tagByCreator.set(creator, tag)
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

export function getComponentTag(creator: ViewModelConstructor): string | undefined {
  return tagByCreator.get(creator)
}

export function clearComponentRegistry(): void {
  templatesByConstructor.clear()
  componentsByTag.clear()
  tagByCreator.clear()
}
