import {
  CONST_PREFIX,
  isPelelaRootTag,
  isStandardHtmlTag,
  isValidComponentAttribute,
  LINK_PREFIX,
  PROP_PREFIX,
} from '../commons/dom'
import { findAllElements, isObject, toCamelCase, unwrapTemplate } from '../commons/helpers'
import { t } from '../commons/i18n'
import { hasProperty, isUnsafeKey, sanitizeHTML } from '../commons/sanitization'
import { UnknownComponentError } from '../errors'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { getComponentByTag, getRegisteredTags } from '../registry/componentRegistry'
import type { PelelaElement } from '../types'
import { getNestedProperty, setNestedProperty } from './nestedProperties'
import { setupBindings } from './setupBindings'
import type { ComponentBinding, ViewModel } from './types'

function isLink(attr: Attr): boolean {
  return attr.name.startsWith(LINK_PREFIX)
}

function isProps(attr: Attr): boolean {
  return attr.name.startsWith(PROP_PREFIX)
}

function isConst(attr: Attr): boolean {
  return attr.name.startsWith(CONST_PREFIX)
}

function isNumberConstant(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Number(value))
}

function parseConstant(value: string): string | number {
  return isNumberConstant(value) ? Number(value) : value
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

function extractConstantBindings(
  attributes: NamedNodeMap,
): Array<{ childKey: string; value: string | number }> {
  return Array.from(attributes)
    .filter(isConst)
    .map((attr) => ({
      childKey: toCamelCase(attr.name.substring(CONST_PREFIX.length)),
      value: parseConstant(attr.value),
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

function handleLinkPropagation(
  linkBindings: Array<{ parentKey: string; childKey: string }>,
  parentViewModel: ViewModel<object>,
  reactiveInstance: ViewModel<object>,
  changedPath: string,
): void {
  const linkBinding = linkBindings.find((binding) => binding.childKey === changedPath)
  if (!linkBinding) return

  if (isUnsafeKey(linkBinding.parentKey)) return

  if (linkBinding.parentKey.includes('.')) {
    setNestedProperty(parentViewModel, linkBinding.parentKey, reactiveInstance[changedPath])
  } else {
    ;(parentViewModel as Record<string, unknown>)[linkBinding.parentKey] =
      reactiveInstance[changedPath]
  }
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
    const constantBindings = extractConstantBindings(element.attributes)
    const linkBindings = extractLinkBindings(element.attributes)
    const oneWayBindings = extractOneWayBindings(element.attributes)
    const allMappings = [...linkBindings, ...oneWayBindings]

    constantBindings.forEach(({ childKey, value }) => {
      if (isUnsafeKey(childKey)) {
        throw new Error(
          t('errors.security.prototypePollution', {
            keys: childKey,
          }),
        )
      }

      instance[childKey] = value
    })

    allMappings.forEach(({ parentKey, childKey }) => {
      if (isUnsafeKey(parentKey) || isUnsafeKey(childKey)) {
        throw new Error(
          t('errors.security.prototypePollution', {
            keys: `${parentKey} or ${childKey}`,
          }),
        )
      }

      const pathSegments = parentKey.split('.')
      const parentValue = pathSegments.reduce((current, segment, index) => {
        if (!isObject(current) || !hasProperty(current as object, segment)) {
          throw new Error(
            t('errors.compiler.missingParentProperty', {
              tag: element.tagName.toLowerCase(),
              parentKey: pathSegments.slice(0, index + 1).join('.'),
            }),
          )
        }
        return (current as Record<string, unknown>)[segment]
      }, parentViewModel as unknown)

      instance[childKey] = parentValue
    })

    // Buffer change paths during setup to avoid losing reactive updates
    const bufferedPaths: string[] = []
    const isSetupComplete = { value: false }
    let renderChild: (changedPath?: string) => void = () => {}
    const reactiveInstance = createReactiveViewModel(instance, (changedPath: string) => {
      if (isUnsafeKey(changedPath)) return

      handleLinkPropagation(linkBindings, parentViewModel, reactiveInstance, changedPath)

      // Buffer changes during setup, render directly after setup
      if (isSetupComplete.value) {
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
    isSetupComplete.value = true

    // Flush buffered changes after setupBindings assigns renderChild
    bufferedPaths.forEach((path) => {
      renderChild(path)
    })

    bindings.push({
      childViewModel: reactiveInstance,
      mappings: allMappings,
      renderChild,
    })
  })

  return bindings
}

export function renderComponentBindings<T extends object>(
  bindings: ComponentBinding[],
  parentViewModel: ViewModel<T>,
  changedPath?: string,
): void {
  bindings.forEach((binding) => {
    binding.mappings.forEach(({ parentKey, childKey }) => {
      if (isUnsafeKey(parentKey) || isUnsafeKey(childKey)) {
        return
      }

      const parentValue = parentKey.includes('.')
        ? getNestedProperty(parentViewModel, parentKey)
        : (parentViewModel as Record<string, unknown>)[parentKey]
      const childValue = (binding.childViewModel as Record<string, unknown>)[childKey]

      if (parentValue !== childValue) {
        ;(binding.childViewModel as Record<string, unknown>)[childKey] = parentValue
        binding.renderChild?.(childKey)
      } else if (
        isObject(parentValue) &&
        changedPath !== undefined &&
        isPathAffected(parentKey, changedPath)
      ) {
        binding.renderChild?.(childKey)
      }
    })
  })
}

function isPathAffected(parentKey: string, changedPath: string): boolean {
  return (
    changedPath === parentKey ||
    changedPath.startsWith(`${parentKey}.`) ||
    changedPath.startsWith(`${parentKey}[`)
  )
}
