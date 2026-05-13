import {
  isPelelaRootTag,
  isStandardHtmlTag,
  isValidComponentAttribute,
  LINK_PREFIX,
  PROP_PREFIX,
} from '../commons/dom'
import { findAllElements, toCamelCase, unwrapTemplate } from '../commons/helpers'
import { t } from '../commons/i18n'
import { hasProperty, isUnsafeKey, sanitizeHTML } from '../commons/sanitization'
import { UnknownComponentError } from '../errors'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { getComponentByTag, getRegisteredTags } from '../registry/componentRegistry'
import type { PelelaElement } from '../types'
import { setupBindings } from './setupBindings'
import type { ComponentBinding, ViewModel } from './types'

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
    if (!isValidComponentAttribute(attr.name)) {
      throw new Error(
        t('errors.compiler.invalidComponentAttribute', {
          tag: element.tagName.toLowerCase(),
          attr: attr.name,
        }),
      )
    }
  })
}

function isPotentialComponent(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()
  return !isPelelaRootTag(tagName) && !isStandardHtmlTag(tagName)
}

function validateTags(root: HTMLElement, registeredTags: string[]): void {
  const allElements = [root, ...root.querySelectorAll<HTMLElement>('*')]

  allElements.filter(isPotentialComponent).forEach((element) => {
    const tagName = element.tagName.toLowerCase()
    if (!registeredTags.includes(tagName)) {
      throw new UnknownComponentError(tagName, element)
    }
  })
}

export function setupComponentBindings<T extends object>(
  root: HTMLElement,
  parentViewModel: ViewModel<T>,
): ComponentBinding[] {
  const registeredTags = getRegisteredTags()
  validateTags(root, registeredTags)
  if (registeredTags.length === 0) return []

  const selector = registeredTags.join(',')
  const customElements = findAllElements(root, selector)
  const bindings: ComponentBinding[] = []

  customElements.forEach((element) => {
    if ((element as PelelaElement<Record<string, unknown>>).__pelelaViewModel) {
      return
    }

    const tagName = element.tagName.toLowerCase()
    const componentDef = getComponentByTag(tagName)
    if (!componentDef) return

    assertOnlyValidComponentAttributes(element)

    const instance = new componentDef.creator() as Record<string, unknown>
    const linkBindings = extractLinkBindings(element.attributes)
    const oneWayBindings = extractOneWayBindings(element.attributes)
    const allMappings = [...linkBindings, ...oneWayBindings]

    allMappings.forEach(({ parentKey, childKey }) => {
      if (isUnsafeKey(parentKey) || isUnsafeKey(childKey)) {
        throw new Error(
          t('errors.security.prototypePollution', {
            keys: `${parentKey} or ${childKey}`,
          }),
        )
      }

      if (!parentKey.includes('.') && !hasProperty(parentViewModel, parentKey)) {
        throw new Error(
          t('errors.compiler.missingParentProperty', {
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
      if (isUnsafeKey(changedPath)) return

      const linkBinding = linkBindings.find((binding) => binding.childKey === changedPath)
      if (linkBinding) {
        if (isUnsafeKey(linkBinding.parentKey)) return
        ;(parentViewModel as Record<string, unknown>)[linkBinding.parentKey] =
          reactiveInstance[changedPath]
      }

      // Buffer changes during setup, render directly after setup
      if (isSetupComplete) {
        renderChild(changedPath)
      } else {
        bufferedPaths.push(changedPath)
      }
    })

    const sanitizedHtml = sanitizeHTML(componentDef.entry.template)
    element.innerHTML = unwrapTemplate(sanitizedHtml)
    ;(element as PelelaElement<Record<string, unknown>>).__pelelaViewModel = reactiveInstance

    // The component tag's own 'if' belongs to the parent's view model.
    // Pass skipRootIf so the child binding setup doesn't try to validate it.
    renderChild = setupBindings(element, reactiveInstance, { skipRootIf: true })
    isSetupComplete = true

    // Flush buffered changes after setupBindings assigns renderChild
    bufferedPaths.forEach((path) => {
      renderChild(path)
    })

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
      if (isUnsafeKey(parentKey) || isUnsafeKey(childKey)) {
        return
      }

      const parentValue = (parentViewModel as Record<string, unknown>)[parentKey]
      const childValue = (binding.childViewModel as Record<string, unknown>)[childKey]

      if (parentValue !== childValue) {
        ;(binding.childViewModel as Record<string, unknown>)[childKey] = parentValue
      }
    })
  })
}
