import { extractElementSnippet, filterOwnElements, isNestedPropertyPath } from '../commons/helpers'
import {
  InvalidBindingSyntaxError,
  InvalidDOMStructureError,
  InvalidPropertyTypeError,
} from '../errors/index'
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
  const match = expression.trim().match(/^(\w+)\s+of\s+(\w+)$/)
  if (!match) return null
  return { itemName: match[1], collectionName: match[2] }
}

function createExtendedViewModel<T extends object>(
  parentViewModel: ViewModel<T>,
  itemName: string,
  itemRef: { current: unknown },
): ViewModel {
  return new Proxy(
    {},
    {
      has(_target, prop) {
        if (isNestedPropertyPath(prop, itemName)) return true
        return prop in parentViewModel
      },
      get(_target, prop) {
        if (prop === itemName) return itemRef.current
        if (isNestedPropertyPath(prop, itemName)) {
          const itemProp = (prop as string).substring(itemName.length + 1)
          return getNestedProperty(itemRef.current, itemProp)
        }
        return parentViewModel[prop as string]
      },
      set(_target, prop, value) {
        if (prop === itemName) {
          itemRef.current = value
          return true
        }
        if (isNestedPropertyPath(prop, itemName)) return true
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
  const wrapper = document.createElement('div')
  const clonedForSearch = element.cloneNode(true) as HTMLElement
  wrapper.appendChild(clonedForSearch)
  const tempBindings = {
    valueBindings: setupValueBindings(wrapper, viewModel),
    contentBindings: setupContentBindings(wrapper, viewModel),
    ifBindings: setupIfBindings(wrapper, viewModel),
    classBindings: setupClassBindings(wrapper, viewModel),
    styleBindings: setupStyleBindings(wrapper, viewModel),
  }
  setupClickBindings(element, viewModel)
  const bindings = {
    valueBindings: tempBindings.valueBindings.map((binding) =>
      mapBindingToRealElement(binding, clonedForSearch, element),
    ),
    contentBindings: tempBindings.contentBindings.map((binding) =>
      mapBindingToRealElement(binding, clonedForSearch, element),
    ),
    ifBindings: tempBindings.ifBindings.map((binding) =>
      mapBindingToRealElement(binding, clonedForSearch, element),
    ),
    classBindings: tempBindings.classBindings.map((binding) =>
      mapBindingToRealElement(binding, clonedForSearch, element),
    ),
    styleBindings: tempBindings.styleBindings.map((binding) =>
      mapBindingToRealElement(binding, clonedForSearch, element),
    ),
  }
  return () => {
    renderValueBindings(bindings.valueBindings, viewModel)
    renderContentBindings(bindings.contentBindings, viewModel)
    renderIfBindings(bindings.ifBindings, viewModel)
    renderClassBindings(bindings.classBindings, viewModel)
    renderStyleBindings(bindings.styleBindings, viewModel)
    renderComponentBindings(componentBindings, viewModel)
  }
}

function mapBindingToRealElement<T extends { element: HTMLElement }>(
  binding: T,
  clonedRoot: HTMLElement,
  realRoot: HTMLElement,
): T {
  return { ...binding, element: mapElementPath(binding.element, clonedRoot, realRoot) }
}

function mapElementPath(
  sourceElement: HTMLElement,
  sourceRoot: HTMLElement,
  targetRoot: HTMLElement,
): HTMLElement {
  if (sourceElement === sourceRoot) return targetRoot
  const buildPath = (element: HTMLElement, root: HTMLElement): number[] => {
    const parent = element.parentElement
    if (!parent || element === root) return []
    const index = Array.from(parent.children).indexOf(element)
    return [...buildPath(parent, root), index]
  }
  const path = buildPath(sourceElement, sourceRoot)
  return path.reduce((currentElement: HTMLElement, index) => {
    const children = currentElement.children
    if (index >= children.length) return currentElement
    const nextElement = children[index] as HTMLElement
    return nextElement || currentElement
  }, targetRoot)
}

function setupSingleForEachBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding | null {
  const expression = element.getAttribute('for-each')
  if (!expression?.trim()) return null
  const parsed = parseForEachExpression(expression)
  if (!parsed) throw new InvalidBindingSyntaxError('for-each', expression, 'item of collection')
  const { itemName, collectionName } = parsed
  assertViewModelProperty(viewModel, collectionName, 'for-each', element)
  const collection = viewModel[collectionName]
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
  template.removeAttribute('for-each')
  if (!element.parentNode)
    throw new InvalidDOMStructureError('for-each', 'element has no parent node')
  const placeholder = document.createComment(`for-each: ${itemName} of ${collectionName}`)
  element.parentNode.insertBefore(placeholder, element)
  const extraDependencies = extractExtraDependencies(element, itemName, collectionName)
  element.remove()
  return {
    collectionName,
    itemName,
    template,
    placeholder,
    renderedElements: [],
    previousLength: 0,
    extraDependencies,
  }
}

function isBindingAttribute(attrName: string): boolean {
  return (
    attrName.startsWith('bind-') ||
    attrName.startsWith('link-') ||
    attrName === 'click' ||
    attrName.includes('-')
  )
}

function isExternalDependency(propPath: string, itemName: string, collectionName: string): boolean {
  return !isNestedPropertyPath(propPath, itemName) && propPath !== collectionName
}

function extractExtraDependencies(
  element: HTMLElement,
  itemName: string,
  collectionName: string,
): string[] {
  const deps = new Set<string>()
  const allElements = [element, ...Array.from(element.querySelectorAll('*'))]
  for (const el of allElements) {
    for (const attr of Array.from(el.attributes)) {
      if (isBindingAttribute(attr.name)) {
        const propPath = attr.value
        if (isExternalDependency(propPath, itemName, collectionName)) {
          deps.add(propPath.split('.')[0])
        }
      }
    }
  }
  return Array.from(deps)
}

export function setupForEachBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding[] {
  const elements = root.querySelectorAll<HTMLElement>('[for-each]')
  const ownElements = filterOwnElements(elements, root)
  return ownElements
    .map((element) => setupSingleForEachBinding(element, viewModel))
    .filter((binding): binding is ForEachBinding => binding !== null)
}

function createNewElement<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  item: unknown,
): void {
  const element = binding.template.cloneNode(true) as HTMLElement
  const itemRef = { current: item }
  const extendedViewModel = createExtendedViewModel(viewModel, binding.itemName, itemRef)
  const render = setupBindingsForElement(element, extendedViewModel)
  const lastElement =
    binding.renderedElements[binding.renderedElements.length - 1]?.element || binding.placeholder
  binding.renderedElements.push({ element, viewModel: extendedViewModel, itemRef, render })
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
  collection.slice(previousLength).forEach((item) => {
    createNewElement(binding, viewModel, item)
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
    rendered.render()
  })
}

function renderSingleForEachBinding<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
): void {
  const collection = viewModel[binding.collectionName]
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
