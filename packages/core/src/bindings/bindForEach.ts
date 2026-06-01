import { stringify } from 'devalue'
import { LINK_PREFIX, PROP_PREFIX } from '../commons/dom'
import {
  extractElementSnippet,
  filterOwnElements,
  findAllElements,
  IDENTIFIER_PATTERN,
  isPropertyOrNestedPath,
  isValidIdentifier,
} from '../commons/helpers'
import {
  InvalidBindingSyntaxError,
  InvalidDOMStructureError,
  InvalidPropertyTypeError,
} from '../errors/index'
import { getComponentByTag } from '../registry/componentRegistry'
import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { renderClassBindings, setupClassBindings } from './bindClass'
import { setupClickBindings } from './bindClick'
import { renderComponentBindings, setupComponentBindings } from './bindComponent'
import { renderContentBindings, setupContentBindings } from './bindContent'
import { renderIfBindings, setupIfBindings } from './bindIf'
import { renderStyleBindings, setupStyleBindings } from './bindStyle'
import { renderValueBindings, setupValueBindings } from './bindValue'
import { getNestedProperty } from './nestedProperties'
import type { ForEachBinding, ViewModel } from './types'

function parseForEachExpression(
  expression: string,
): { itemName: string; collectionName: string } | null {
  const identifier = IDENTIFIER_PATTERN.source.replace(/^\^|\$$/g, '')
  const match = expression
    .trim()
    .match(new RegExp(`^(${identifier})\\s+of\\s+(${identifier}(\\.${identifier})*)$`))
  if (!match) return null
  return { itemName: match[1], collectionName: match[2] }
}

type ExtendedViewModelOptions<T extends object> = {
  parentViewModel: ViewModel<T>
  itemName: string
  itemRef: { current: unknown }
  indexName: string | null
  indexRef: { current: number }
}

export function createExtendedViewModel<T extends object>({
  parentViewModel,
  itemName,
  itemRef,
  indexName,
  indexRef,
}: ExtendedViewModelOptions<T>): ViewModel {
  return new Proxy(
    {},
    {
      has(_target, prop) {
        if (prop === indexName) return true
        if (isPropertyOrNestedPath(prop, itemName)) return true
        return prop in parentViewModel
      },
      getOwnPropertyDescriptor(_target, prop) {
        if (prop === indexName || isPropertyOrNestedPath(prop, itemName)) {
          return { configurable: true, enumerable: true, value: undefined } // value isn't strictly needed for hasOwn, but we provide a valid descriptor
        }
        return Object.getOwnPropertyDescriptor(parentViewModel, prop)
      },
      get(_target, prop) {
        if (prop === indexName) return indexRef.current
        if (prop === itemName) return itemRef.current
        if (isPropertyOrNestedPath(prop, itemName)) {
          const itemProp = (prop as string).substring(itemName.length + 1)
          return getNestedProperty(itemRef.current, itemProp)
        }
        return parentViewModel[prop as string]
      },
      set(_target, prop, value) {
        // Both index and item variables are read-only within the for-each scope
        if (prop === indexName || isPropertyOrNestedPath(prop, itemName)) return true
        ;(parentViewModel as Record<string, unknown>)[prop as string] = value
        return true
      },
    },
  ) as ViewModel
}

function setupBindingsForElement<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): () => void {
  const componentBindings = setupComponentBindings(element, viewModel)
  const bindings = {
    valueBindings: setupValueBindings(element, viewModel),
    contentBindings: setupContentBindings(element, viewModel),
    ifBindings: setupIfBindings(element, viewModel),
    classBindings: setupClassBindings(element, viewModel),
    styleBindings: setupStyleBindings(element, viewModel),
  }
  setupClickBindings(element, viewModel)

  return () => {
    renderValueBindings(bindings.valueBindings, viewModel)
    renderContentBindings(bindings.contentBindings, viewModel)
    renderIfBindings(bindings.ifBindings, viewModel)
    renderClassBindings(bindings.classBindings, viewModel)
    renderStyleBindings(bindings.styleBindings, viewModel)
    renderComponentBindings(componentBindings, viewModel)
  }
}

export function setupSingleForEachBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding | null {
  const expression = element.getAttribute('for-each')
  if (!expression?.trim()) return null
  const parsed = parseForEachExpression(expression)
  if (!parsed) throw new InvalidBindingSyntaxError('for-each', expression, 'item of collection')
  const { itemName, collectionName } = parsed
  const rawIndexName = element.getAttribute('index')
  const indexName = rawIndexName?.trim() ? rawIndexName.trim() : null
  if (indexName && !isValidIdentifier(indexName)) {
    throw new InvalidBindingSyntaxError('index', rawIndexName ?? '', 'valid identifier')
  }
  const collectionFirstSegment = collectionName.split('.')[0]
  assertViewModelProperty(viewModel, collectionFirstSegment, 'for-each', element)
  const collection = collectionName.includes('.')
    ? getNestedProperty(viewModel, collectionName)
    : viewModel[collectionName]
  if (!Array.isArray(collection)) {
    throw new InvalidPropertyTypeError({
      propertyName: collectionName,
      bindingKind: 'for-each',
      expectedType: 'an array',
      viewModelName: viewModel.constructor?.name ?? 'Unknown',
      elementSnippet: extractElementSnippet(element),
    })
  }
  const template = element.cloneNode(true) as HTMLElement
  // Remove framework-specific attributes from the template so they don't appear
  // as raw HTML attributes on every cloned element rendered in the DOM.
  template.removeAttribute('for-each')
  if (rawIndexName !== null) template.removeAttribute('index')
  if (!element.parentNode)
    throw new InvalidDOMStructureError('for-each', 'element has no parent node')
  const placeholder = document.createComment(`for-each: ${itemName} of ${collectionName}`)
  element.parentNode.insertBefore(placeholder, element)
  const extraDependencies = extractExtraDependencies(element, itemName, collectionName, indexName)
  element.remove()
  return {
    collectionName,
    itemName,
    indexName,
    template,
    placeholder,
    renderedElements: [],
    previousLength: 0,
    extraDependencies,
  }
}

const EXACT_BINDING_ATTRIBUTES = ['click', 'if', 'for-each', 'index'] as const
type ExactBindingAttribute = (typeof EXACT_BINDING_ATTRIBUTES)[number]

export function isBindingAttribute(attrName: string): boolean {
  // Exclude standard HTML attributes that contain hyphens
  if (
    /^aria-/.test(attrName) ||
    /^data-/.test(attrName) ||
    attrName === 'role' ||
    /^xml-/.test(attrName)
  ) {
    return false
  }
  // Accept only framework binding prefixes
  return (
    attrName.startsWith('bind-') ||
    attrName.startsWith(LINK_PREFIX) ||
    attrName.startsWith(PROP_PREFIX) ||
    EXACT_BINDING_ATTRIBUTES.includes(attrName as ExactBindingAttribute)
  )
}

export function isCustomComponent(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()
  return getComponentByTag(tagName) !== undefined
}

function isExternalDependency(
  propPath: string,
  itemName: string,
  collectionName: string,
  indexName: string | null,
): boolean {
  return (
    !isPropertyOrNestedPath(propPath, itemName) &&
    (indexName === null || !isPropertyOrNestedPath(propPath, indexName)) &&
    propPath !== collectionName
  )
}

function extractExtraDependencies(
  parentElement: HTMLElement,
  itemName: string,
  collectionName: string,
  indexName: string | null,
): string[] {
  const allElements = [
    parentElement,
    ...Array.from(parentElement.querySelectorAll<HTMLElement>('*')),
  ]
  const allAttributes = allElements.flatMap((element) => Array.from(element.attributes))

  return allAttributes
    .filter((attr) => {
      // Exclude loop definition attributes on the parent element itself
      const isParentLoopDefinition =
        attr.ownerElement === parentElement && (attr.name === 'for-each' || attr.name === 'index')
      if (isParentLoopDefinition) return false

      const isFrameworkBinding = isBindingAttribute(attr.name)
      const isKebabCaseProp = attr.name.includes('-') && !isFrameworkBinding
      const element = attr.ownerElement as HTMLElement
      return isFrameworkBinding || (isKebabCaseProp && isCustomComponent(element))
    })
    .map((attr) => attr.value)
    .filter(
      (propPath) => propPath && isExternalDependency(propPath, itemName, collectionName, indexName),
    )
    .map((propPath) => {
      const collectionFirstSegment = collectionName.split('.')[0]
      return propPath.startsWith(collectionFirstSegment) ? collectionFirstSegment : propPath
    })
}

export function setupForEachBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding[] {
  const elements = findAllElements(root, '[for-each]')
  const ownElements = filterOwnElements(elements, root)
  return ownElements
    .map((element) => setupSingleForEachBinding(element, viewModel))
    .filter((binding): binding is ForEachBinding => binding !== null)
}

function createNewElement<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  item: unknown,
  index: number,
): void {
  const element = binding.template.cloneNode(true) as HTMLElement
  const itemRef = { current: item }
  const indexRef = { current: index }
  const extendedViewModel = createExtendedViewModel({
    parentViewModel: viewModel,
    itemName: binding.itemName,
    itemRef,
    indexName: binding.indexName,
    indexRef,
  })
  const render = setupBindingsForElement(element, extendedViewModel)

  if (element.tagName === 'OPTION') {
    if (typeof item === 'object' && item !== null) {
      ;(element as HTMLOptionElement).value = stringify(item)
    } else {
      ;(element as HTMLOptionElement).value = String(item)
    }
  }

  const lastElement =
    binding.renderedElements[binding.renderedElements.length - 1]?.element || binding.placeholder
  binding.renderedElements.push({
    element,
    viewModel: extendedViewModel,
    itemRef,
    indexRef,
    render,
  })
  if (lastElement.parentNode) {
    lastElement.parentNode.insertBefore(element, lastElement.nextSibling)
    render()
  }
}

function addNewElements<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  collection: unknown[],
  previousLength: number,
): void {
  collection.slice(previousLength).forEach((item, sliceIndex) => {
    createNewElement(binding, viewModel, item, previousLength + sliceIndex)
  })
}

function removeExtraElements(binding: ForEachBinding, currentLength: number): void {
  binding.renderedElements.splice(currentLength).forEach(({ element }) => {
    element.remove()
  })
}

function updateExistingElements(binding: ForEachBinding, collection: unknown[]): void {
  binding.renderedElements.forEach((rendered, index) => {
    rendered.itemRef.current = collection[index]
    rendered.indexRef.current = index

    if (rendered.element.tagName === 'OPTION') {
      const item = collection[index]
      if (typeof item === 'object' && item !== null) {
        ;(rendered.element as HTMLOptionElement).value = stringify(item)
      } else {
        ;(rendered.element as HTMLOptionElement).value = String(item)
      }
    }

    rendered.render()
  })
}

function renderSingleForEachBinding<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
): void {
  const collection = binding.collectionName.includes('.')
    ? getNestedProperty(viewModel, binding.collectionName)
    : viewModel[binding.collectionName]
  if (!Array.isArray(collection)) return
  const currentLength = collection.length
  const previousLength = binding.previousLength
  if (currentLength > previousLength) addNewElements(binding, viewModel, collection, previousLength)
  else if (currentLength < previousLength) removeExtraElements(binding, currentLength)
  updateExistingElements(binding, collection)
  binding.previousLength = currentLength
}

export function renderForEachBindings<T extends object>(
  bindings: ForEachBinding[],
  viewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    renderSingleForEachBinding(binding, viewModel)
  })
}
