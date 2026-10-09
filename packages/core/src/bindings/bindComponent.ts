import {
  CONST_PREFIX,
  isPelelaRootTag,
  isStandardHtmlTag,
  isValidComponentAttribute,
  LINK_PREFIX,
  PROP_PREFIX,
} from '../commons/dom'
import {
  extractElementSnippet,
  findAllElements,
  isObject,
  toCamelCase,
  unwrapTemplate,
} from '../commons/helpers'
import { t } from '../commons/i18n'
import { hasProperty, isUnsafeKey, sanitizeHTML } from '../commons/sanitization'
import { isNumberLiteral, parseBooleanLiteral, parseScalarLiteral } from '../commons/typeCasting'
import {
  InvalidConstValueError,
  ReadOnlyPropertyError,
  UnknownComponentError,
  UnknownComponentPropertyError,
} from '../errors'
import { getRawObject } from '../reactivity/proxyIdentity'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { getComponentByTag, getRegisteredTags } from '../registry/componentRegistry'
import type { ConstKind, ConstTypeInfo, PelelaElement, ScalarKind } from '../types'
import { getNestedProperty, isPathAffected, setNestedProperty } from './nestedProperties'
import { setupBindings } from './setupBindings'
import type { ComponentBinding, NotifyParent, ViewModel } from './types'

function isLink(attr: Attr): boolean {
  return attr.name.startsWith(LINK_PREFIX)
}

function isProps(attr: Attr): boolean {
  return attr.name.startsWith(PROP_PREFIX)
}

function isConst(attr: Attr): boolean {
  return attr.name.startsWith(CONST_PREFIX)
}

interface ConstStrategyContext {
  propertyName: string
  componentTag: string
  viewModelName: string
  element: HTMLElement
}

interface ResolveConstantOptions extends ConstStrategyContext {
  rawValue: string
  target: unknown
  declaredKind?: ConstKind | ConstTypeInfo
}

type ConstStrategy = (rawValue: string, context: ConstStrategyContext) => string | number | boolean

const CONST_KIND_STRATEGIES: Record<string, ConstStrategy | undefined> = {
  number: (rawValue, context) => {
    if (!isNumberLiteral(rawValue)) {
      throw new InvalidConstValueError({
        propertyName: context.propertyName,
        value: rawValue,
        expected: t('errors.compiler.constExpectedNumber'),
        componentTag: context.componentTag,
        viewModelName: context.viewModelName,
        elementSnippet: extractElementSnippet(context.element),
      })
    }
    return Number(rawValue)
  },
  boolean: (rawValue, context) => {
    const booleanLiteral = parseBooleanLiteral(rawValue.trim())
    if (booleanLiteral === null) {
      throw new InvalidConstValueError({
        propertyName: context.propertyName,
        value: rawValue,
        expected: t('errors.compiler.constExpectedBoolean'),
        componentTag: context.componentTag,
        viewModelName: context.viewModelName,
        elementSnippet: extractElementSnippet(context.element),
      })
    }
    return booleanLiteral
  },
  string: (rawValue) => rawValue,
  undefined: (rawValue) => parseScalarLiteral(rawValue),
}

/**
 * Coerces without throwing: `undefined` means the raw text has no valid shape
 * for that kind, so the caller can try the next allowed kind instead.
 */
function coerceScalar(kind: ScalarKind, rawValue: string): string | number | boolean | undefined {
  if (kind === 'number') return isNumberLiteral(rawValue) ? Number(rawValue) : undefined
  if (kind === 'boolean') return parseBooleanLiteral(rawValue.trim()) ?? undefined
  return rawValue
}

function isScalarKind(kind: ConstKind): kind is ScalarKind {
  return kind === 'number' || kind === 'boolean' || kind === 'string'
}

function formatAllowedValue(value: string | number | boolean): string {
  return typeof value === 'string' ? `"${value}"` : `${value}`
}

function expectedTextFor(descriptor: ConstTypeInfo): string {
  if (descriptor.allowedValues !== undefined) {
    const values = descriptor.allowedValues.map(formatAllowedValue).join(', ')
    return t('errors.compiler.constExpectedAllowedValues', { values })
  }
  const kinds = (descriptor.allowedKinds ?? [descriptor.kind]).join(', ')
  return t('errors.compiler.constExpectedUnion', { kinds })
}

function resolveDescribedValue(
  descriptor: ConstTypeInfo,
  options: ResolveConstantOptions,
): string | number | boolean {
  if (descriptor.kind === 'other') return resolveWithKind('other', options)
  if (descriptor.kind === 'unknown' && descriptor.allowedKinds === undefined) {
    return resolveWithKind(typeof options.target, options)
  }
  const accepted = (descriptor.allowedKinds ?? [descriptor.kind])
    .filter(isScalarKind)
    .map((kind) => coerceScalar(kind, options.rawValue))
    .filter((value): value is string | number | boolean => value !== undefined)
    .find(
      (value) => descriptor.allowedValues === undefined || descriptor.allowedValues.includes(value),
    )
  if (accepted !== undefined) return accepted
  throw new InvalidConstValueError({
    propertyName: options.propertyName,
    value: options.rawValue,
    expected: expectedTextFor(descriptor),
    componentTag: options.componentTag,
    viewModelName: options.viewModelName,
    elementSnippet: extractElementSnippet(options.element),
  })
}

function resolveWithKind(kind: string, options: ResolveConstantOptions): string | number | boolean {
  const strategy = CONST_KIND_STRATEGIES[kind]
  if (strategy === undefined) {
    throw new InvalidConstValueError({
      propertyName: options.propertyName,
      value: options.rawValue,
      expected: t('errors.compiler.constUnsupportedValue'),
      componentTag: options.componentTag,
      viewModelName: options.viewModelName,
      elementSnippet: extractElementSnippet(options.element),
    })
  }
  const { rawValue, propertyName, componentTag, viewModelName, element } = options
  return strategy(rawValue, { propertyName, componentTag, viewModelName, element })
}

function resolveConstantValue(options: ResolveConstantOptions): string | number | boolean {
  if (options.declaredKind !== undefined && typeof options.declaredKind !== 'string') {
    return resolveDescribedValue(options.declaredKind, options)
  }
  const targetKind = typeof options.target
  const kind =
    options.declaredKind === 'unknown' ? targetKind : (options.declaredKind ?? targetKind)
  return resolveWithKind(kind, options)
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
): Array<{ childKey: string; rawValue: string }> {
  return Array.from(attributes)
    .filter(isConst)
    .map((attr) => ({
      childKey: toCamelCase(attr.name.substring(CONST_PREFIX.length)),
      rawValue: attr.value,
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

function throwUnknownChildViewModelProperty(
  childKey: string,
  tagName: string,
  viewModelName: string,
  element: HTMLElement,
): never {
  throw new UnknownComponentPropertyError(
    childKey,
    tagName,
    viewModelName,
    extractElementSnippet(element),
  )
}

function throwReadOnlyProperty(
  childKey: string,
  tagName: string,
  viewModelName: string,
  element: HTMLElement,
): never {
  throw new ReadOnlyPropertyError(childKey, tagName, viewModelName, extractElementSnippet(element))
}

function assertAssignableChildViewModelProperty(
  instance: object,
  childKey: string,
  tagName: string,
  element: HTMLElement,
): void {
  if (!hasProperty(instance, childKey)) {
    throwUnknownChildViewModelProperty(childKey, tagName, instance.constructor.name, element)
  }
  if (!hasWritableDescriptor(instance, childKey)) {
    throwReadOnlyProperty(childKey, tagName, instance.constructor.name, element)
  }
}

function hasWritableDescriptor(instance: object, childKey: string): boolean {
  let current: object | null = instance
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, childKey)
    if (descriptor !== undefined) {
      return descriptor.writable === true || typeof descriptor.set === 'function'
    }
    current = Object.getPrototypeOf(current)
  }
  return false
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
      throw new UnknownComponentError(tagName, element, registeredTags)
    }
  })
}

function haveSameRawValue(parentValue: unknown, childValue: unknown): boolean {
  return (
    isObject(parentValue) &&
    isObject(childValue) &&
    getRawObject(parentValue) === getRawObject(childValue)
  )
}

function resolveLinkParentValue<T extends object>(
  parentViewModel: ViewModel<T>,
  parentKey: string,
): unknown {
  return parentKey.includes('.')
    ? getNestedProperty(parentViewModel, parentKey)
    : (parentViewModel as Record<string, unknown>)[parentKey]
}

/**
 * Propagates an exact top-level child change to the parent view model.
 *
 * Returns whether the parent was assigned. In-place array mutations share the
 * same raw reference with the parent, so assigning would emit a redundant
 * parent notification while rendering is covered by forwardLinkChange.
 */
function handleLinkPropagation(
  linkBindings: Array<{ parentKey: string; childKey: string }>,
  parentViewModel: ViewModel<object>,
  reactiveInstance: ViewModel<object>,
  changedPath: string,
): boolean {
  const linkBinding = linkBindings.find((binding) => binding.childKey === changedPath)
  if (!linkBinding) return false

  if (isUnsafeKey(linkBinding.parentKey)) return false

  const childValue = reactiveInstance[changedPath]
  const parentValue = resolveLinkParentValue(parentViewModel, linkBinding.parentKey)

  if (Array.isArray(childValue) && haveSameRawValue(parentValue, childValue)) {
    return false
  }

  if (linkBinding.parentKey.includes('.')) {
    setNestedProperty(parentViewModel, linkBinding.parentKey, reactiveInstance[changedPath])
  } else {
    ;(parentViewModel as Record<string, unknown>)[linkBinding.parentKey] =
      reactiveInstance[changedPath]
  }
  return true
}

function findLinkForChangedPath(
  linkBindings: Array<{ parentKey: string; childKey: string }>,
  changedPath: string,
): { parentKey: string; childKey: string } | undefined {
  return linkBindings.find(
    ({ childKey }) => changedPath === childKey || changedPath.startsWith(`${childKey}.`),
  )
}

/**
 * Detects in-place array mutations by shared raw identity.
 *
 * Checking Array.isArray alone cannot tell a reassignment (new identity) apart
 * from a mutation such as push (same identity shared with the parent).
 */
function isInPlaceArrayMutation<T extends object>(
  parentViewModel: ViewModel<T>,
  reactiveInstance: ViewModel<object>,
  link: { parentKey: string; childKey: string },
): boolean {
  const childValue = (reactiveInstance as Record<string, unknown>)[link.childKey]
  if (!Array.isArray(childValue)) return false
  const parentValue = resolveLinkParentValue(parentViewModel, link.parentKey)
  return haveSameRawValue(parentValue, childValue)
}

/**
 * Resolves the parent path to forward for a child change.
 *
 * Returns undefined when no forwarding is needed: unlinked paths and top-level
 * reassignments already propagated by handleLinkPropagation. Besides nested
 * changes, only in-place array mutations are forwarded.
 */
type ForwardedParentPathOptions<T extends object> = {
  parentViewModel: ViewModel<T>
  reactiveInstance: ViewModel<object>
  linkBindings: Array<{ parentKey: string; childKey: string }>
  changedPath: string
  alreadyPropagated: boolean
}

function resolveForwardedParentPath<T extends object>(
  options: ForwardedParentPathOptions<T>,
): string | undefined {
  const { parentViewModel, reactiveInstance, linkBindings, changedPath, alreadyPropagated } =
    options
  const link = findLinkForChangedPath(linkBindings, changedPath)
  if (link === undefined) return undefined
  if (changedPath.startsWith(`${link.childKey}.`)) {
    return link.parentKey + changedPath.substring(link.childKey.length)
  }
  if (alreadyPropagated) return undefined
  if (!isInPlaceArrayMutation(parentViewModel, reactiveInstance, link)) return undefined
  return link.parentKey
}

export function setupComponentBindings<T extends object>(
  root: HTMLElement,
  parentViewModel: ViewModel<T>,
  notifyParent?: NotifyParent,
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
    const typeMap = componentDef.entry.typeMap
    const constantBindings = extractConstantBindings(element.attributes)
    const linkBindings = extractLinkBindings(element.attributes)
    const oneWayBindings = extractOneWayBindings(element.attributes)
    const allMappings = [...linkBindings, ...oneWayBindings]

    constantBindings.forEach(({ childKey, rawValue }) => {
      if (isUnsafeKey(childKey)) {
        throw new Error(
          t('errors.security.prototypePollution', {
            keys: childKey,
          }),
        )
      }

      const isOwnedByInstance = hasProperty(instance, childKey)
      const isTypeMapDeclared = typeMap !== undefined && Object.hasOwn(typeMap, childKey)

      if (isOwnedByInstance && !hasWritableDescriptor(instance, childKey)) {
        throwReadOnlyProperty(childKey, tagName, instance.constructor.name, element)
      }
      if (!isOwnedByInstance && !isTypeMapDeclared) {
        throwUnknownChildViewModelProperty(childKey, tagName, instance.constructor.name, element)
      }

      const declaredKind = isTypeMapDeclared ? typeMap[childKey] : undefined
      instance[childKey] = resolveConstantValue({
        rawValue,
        target: instance[childKey],
        declaredKind,
        propertyName: childKey,
        componentTag: tagName,
        viewModelName: instance.constructor.name,
        element,
      })
    })

    allMappings.forEach(({ parentKey, childKey }) => {
      if (isUnsafeKey(parentKey) || isUnsafeKey(childKey)) {
        throw new Error(
          t('errors.security.prototypePollution', {
            keys: `${parentKey} or ${childKey}`,
          }),
        )
      }

      assertAssignableChildViewModelProperty(instance, childKey, tagName, element)

      const pathSegments = parentKey.split('.')
      const isNested = pathSegments.length > 1
      const parentValue = pathSegments.reduce((current, segment, index) => {
        if (!isObject(current) || !hasProperty(current as object, segment)) {
          if (isNested) return undefined

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

    /**
     * Forwards link changes that handleLinkPropagation does not cover.
     *
     * Nested mutations always bubble to the parent. Top-level reassignments are
     * already propagated by handleLinkPropagation, so only in-place array
     * mutations need forwarding here.
     */
    const forwardLinkChange = (changedPath: string, alreadyPropagated = false): void => {
      if (!notifyParent) return

      const forwardedPath = resolveForwardedParentPath({
        parentViewModel,
        reactiveInstance,
        linkBindings,
        changedPath,
        alreadyPropagated,
      })
      if (forwardedPath === undefined) return

      notifyParent(forwardedPath)
    }

    const reactiveInstance = createReactiveViewModel(instance, (changedPath: string) => {
      if (isUnsafeKey(changedPath)) return

      const propagated = handleLinkPropagation(
        linkBindings,
        parentViewModel,
        reactiveInstance,
        changedPath,
      )
      forwardLinkChange(changedPath, propagated)

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
    renderChild = setupBindings(element, reactiveInstance, {
      skipRootIf: true,
      notifyParent: forwardLinkChange,
    })
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

    if (typeof reactiveInstance.initialize === 'function') {
      reactiveInstance.initialize()
    }
  })

  return bindings
}

function resolveBoundValue<T extends object>(
  parentViewModel: ViewModel<T>,
  parentKey: string,
): unknown {
  return parentKey.includes('.')
    ? getNestedProperty(parentViewModel, parentKey)
    : (parentViewModel as Record<string, unknown>)[parentKey]
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

      const parentValue = resolveBoundValue(parentViewModel, parentKey)
      const childValue = (binding.childViewModel as Record<string, unknown>)[childKey]

      // Skip the assignment when parent and child only differ by proxy identity but
      // wrap the same raw object: the child already observes every mutation, and
      // re-assigning would trigger an onChange round-trip that never converges.
      if (parentValue !== childValue && !haveSameRawValue(parentValue, childValue)) {
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
