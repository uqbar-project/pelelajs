import { toCamelCase, unwrapTemplate } from '../commons/helpers'
import { sanitizeHTML } from '../commons/sanitization'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { getComponentByTag, getRegisteredTags } from '../registry/componentRegistry'
import type { PelelaElement } from '../types'
import { setupBindings } from './setupBindings'
import type { ComponentBinding, ViewModel } from './types'

const LINK_PREFIX = 'link-'

function isLink(attr: Attr): boolean {
  return attr.name.startsWith(LINK_PREFIX)
}

function extractLinkBindings(
  attributes: NamedNodeMap,
): Array<{ parentKey: string; childKey: string }> {
  return Array.from(attributes)
    .filter(isLink)
    .map((attr) => ({
      childKey: toCamelCase(attr.name.substring(LINK_PREFIX.length)),
      parentKey: attr.value,
    }))
}

function extractOneWayBindings(
  attributes: NamedNodeMap,
): Array<{ parentKey: string; childKey: string }> {
  return Array.from(attributes)
    .filter((attr) => !isLink(attr))
    .map((attr) => ({
      childKey: toCamelCase(attr.name),
      parentKey: attr.value,
    }))
}

export function setupComponentBindings<T extends object>(
  root: HTMLElement,
  parentViewModel: ViewModel<T>,
): ComponentBinding[] {
  const registeredTags = getRegisteredTags()
  if (registeredTags.length === 0) return []

  const selector = registeredTags.join(',')
  const customElements = Array.from(root.querySelectorAll<HTMLElement>(selector))
  const bindings: ComponentBinding[] = []

  customElements.forEach((element) => {
    const tagName = element.tagName.toLowerCase()
    const componentDef = getComponentByTag(tagName)
    if (!componentDef) return

    const instance = new componentDef.ctor() as Record<string, unknown>
    const linkBindings = extractLinkBindings(element.attributes)
    const oneWayBindings = extractOneWayBindings(element.attributes)
    const allMappings = [...linkBindings, ...oneWayBindings]

    allMappings.forEach(({ parentKey, childKey }) => {
      if (parentKey in parentViewModel) {
        instance[childKey] = (parentViewModel as Record<string, unknown>)[parentKey]
      }
    })

    let renderChild: (changedPath?: string) => void = () => {}
    const reactiveInstance = createReactiveViewModel(instance, (changedPath: string) => {
      const linkBinding = linkBindings.find((binding) => binding.childKey === changedPath)
      if (linkBinding) {
        ;(parentViewModel as Record<string, unknown>)[linkBinding.parentKey] =
          reactiveInstance[changedPath]
      }

      renderChild(changedPath)
    })

    const sanitizedHtml = sanitizeHTML(componentDef.entry.template)
    element.innerHTML = unwrapTemplate(sanitizedHtml)
    renderChild = setupBindings(element, reactiveInstance)
    ;(element as PelelaElement<Record<string, unknown>>).__pelelaViewModel = reactiveInstance

    bindings.push({
      childViewModel: reactiveInstance,
      mappings: allMappings,
    })
  })

  return bindings
}

export function renderComponentBindings<T extends object>(
  bindings: ComponentBinding[],
  parentViewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    binding.mappings.forEach(({ parentKey, childKey }) => {
      const parentValue = (parentViewModel as Record<string, unknown>)[parentKey]
      const childValue = (binding.childViewModel as Record<string, unknown>)[childKey]

      if (parentValue !== childValue) {
        ;(binding.childViewModel as Record<string, unknown>)[childKey] = parentValue
      }
    })
  })
}
