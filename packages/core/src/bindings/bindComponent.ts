import { toCamelCase, unwrapTemplate } from '../commons/helpers'
import { t } from '../commons/i18n'
import { sanitizeHTML } from '../commons/sanitization'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { getComponentByTag, getRegisteredTags } from '../registry/componentRegistry'
import type { PelelaElement } from '../types'
import { setupBindings } from './setupBindings'
import type { ComponentBinding, ViewModel } from './types'

export const LINK_PREFIX = 'link-'
export const PROP_PREFIX = 'prop-'

function isLink(attr: Attr): boolean {
  return attr.name.startsWith(LINK_PREFIX)
}

function isProps(attr: Attr): boolean {
  return attr.name.startsWith(PROP_PREFIX)
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
    .filter(isProps)
    .map((attr) => ({
      childKey: toCamelCase(attr.name.substring(PROP_PREFIX.length)),
      parentKey: attr.value,
    }))
}

function assertOnlyValidComponentAttributes(element: HTMLElement): void {
  Array.from(element.attributes).forEach((attr) => {
    if (!isLink(attr) && !isProps(attr)) {
      throw new Error(
        t('compiler.invalidComponentAttribute', {
          tag: element.tagName.toLowerCase(),
          attr: attr.name,
        }),
      )
    }
  })
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

    assertOnlyValidComponentAttributes(element)

    const instance = new componentDef.creator() as Record<string, unknown>
    const linkBindings = extractLinkBindings(element.attributes)
    const oneWayBindings = extractOneWayBindings(element.attributes)
    const allMappings = [...linkBindings, ...oneWayBindings]

    allMappings.forEach(({ parentKey, childKey }) => {
      if (!parentKey.includes('.') && !(parentKey in parentViewModel)) {
        throw new Error(
          t('compiler.missingParentProperty', {
            tag: element.tagName.toLowerCase(),
            parentKey,
          }),
        )
      }
      instance[childKey] = (parentViewModel as Record<string, unknown>)[parentKey]
    })

    // Buffer change paths during setup to avoid losing reactive updates
    const bufferedPaths: string[] = []
    let isSetupComplete = false
    let renderChild: (changedPath?: string) => void = () => {}
    const reactiveInstance = createReactiveViewModel(instance, (changedPath: string) => {
      const linkBinding = linkBindings.find((binding) => binding.childKey === changedPath)
      if (linkBinding) {
        ;(parentViewModel as Record<string, unknown>)[linkBinding.parentKey] =
          reactiveInstance[changedPath]
      }

      // Buffer changes during setup, render directly after setup
      if (!isSetupComplete) {
        bufferedPaths.push(changedPath)
      } else {
        renderChild(changedPath)
      }
    })

    const sanitizedHtml = sanitizeHTML(componentDef.entry.template)
    element.innerHTML = unwrapTemplate(sanitizedHtml)
    renderChild = setupBindings(element, reactiveInstance)
    isSetupComplete = true

    // Flush buffered changes after setupBindings assigns renderChild
    bufferedPaths.forEach((path) => {
      renderChild(path)
    })
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
