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
import { isInsideComponent, querySelectorAllInclusive } from './componentHelpers'
import type { ForEachBinding, ViewModel } from './types'

function parseForEachExpression(expression: string): {
  itemName: string
  collectionName: string
} | null {
  const match = expression.trim().match(/^(\w+)\s+of\s+(\w+)$/)
  if (!match) return null
  return {
    itemName: match[1],
    collectionName: match[2],
  }
}

function createExtendedViewModel<T extends object>(
  parentViewModel: ViewModel<T>,
  itemName: string,
  itemRef: { current: any },
): ViewModel {
  return new Proxy(
    {},
    {
      has(_target, prop) {
        if (prop === itemName) return true
        if (typeof prop === 'string' && prop.startsWith(`${itemName}.`)) {
          return true
        }
        return prop in parentViewModel
      },
      get(_target, prop) {
        if (prop === itemName) {
          return itemRef.current
        }
        if (typeof prop === 'string' && prop.startsWith(`${itemName}.`)) {
          const itemProp = prop.substring(itemName.length + 1)
          return getNestedProperty(itemRef.current, itemProp)
        }
        return parentViewModel[prop as string]
      },
      set(_target, prop, value) {
        if (prop === itemName) {
          itemRef.current = value
          return true
        }
        if (typeof prop === 'string' && prop.startsWith(`${itemName}.`)) {
          return true
        }
        ;(parentViewModel as Record<string, unknown>)[prop as string] = value
        return true
      },
    },
  ) as ViewModel
}

function getNestedProperty(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
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

  const render = () => {
    renderValueBindings(bindings.valueBindings, viewModel)
    renderContentBindings(bindings.contentBindings, viewModel)
    renderIfBindings(bindings.ifBindings, viewModel)
    renderClassBindings(bindings.classBindings, viewModel)
    renderStyleBindings(bindings.styleBindings, viewModel)
    renderComponentBindings(componentBindings)
  }

  return render
}

function setupSingleForEachBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding | null {
  const expression = element.getAttribute('for-each')
  if (!expression || !expression.trim()) return null

  const parsed = parseForEachExpression(expression)
  if (!parsed) {
    throw new InvalidBindingSyntaxError('for-each', expression, 'item of collection')
  }

  const { itemName, collectionName } = parsed

  assertViewModelProperty(viewModel, collectionName, 'for-each', element)

  const collection = viewModel[collectionName]
  if (!Array.isArray(collection)) {
    throw new InvalidPropertyTypeError({
      propertyName: collectionName,
      bindingKind: 'for-each',
      expectedType: 'an array',
      viewModelName: viewModel.constructor?.name ?? 'Unknown',
      elementSnippet: element.outerHTML.substring(0, 50),
    })
  }

  const template = element.cloneNode(true) as HTMLElement
  template.removeAttribute('for-each')

  if (!element.parentNode) {
    throw new InvalidDOMStructureError('for-each', 'element has no parent node')
  }

  const placeholder = document.createComment(`for-each: ${itemName} of ${collectionName}`)
  element.parentNode.insertBefore(placeholder, element)
  element.remove()

  return {
    collectionName,
    itemName,
    template,
    placeholder,
    renderedElements: [],
    previousLength: 0,
  }
}

export function setupForEachBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding[] {
  const bindings: ForEachBinding[] = []
  const elements = querySelectorAllInclusive(root, '[for-each]')

  for (const element of elements) {
    if (isInsideComponent(element, root)) {
      continue
    }
    const binding = setupSingleForEachBinding(element, viewModel)
    if (binding) {
      bindings.push(binding)
    }
  }

  return bindings
}

function createNewElement<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  item: any,
  _index: number,
): void {
  const element = binding.template.cloneNode(true) as HTMLElement

  const itemRef = { current: item }
  const extendedViewModel = createExtendedViewModel(viewModel, binding.itemName, itemRef)

  const render = setupBindingsForElement(element, extendedViewModel)

  binding.renderedElements.push({
    element,
    viewModel: extendedViewModel,
    itemRef,
    render,
  })

  const lastElement =
    binding.renderedElements[binding.renderedElements.length - 2]?.element || binding.placeholder

  if (lastElement.parentNode) {
    lastElement.parentNode.insertBefore(element, lastElement.nextSibling)
    render()
  } else {
    console.warn('[pelela] for-each: Could not insert element, parent node not found')
  }
}

function addNewElements<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  collection: any[],
  previousLength: number,
): void {
  for (let i = previousLength; i < collection.length; i++) {
    createNewElement(binding, viewModel, collection[i], i)
  }
}

function removeExtraElements(binding: ForEachBinding, currentLength: number): void {
  const toRemove = binding.renderedElements.splice(currentLength)
  for (const { element } of toRemove) {
    element.remove()
  }
}

function updateExistingElements(binding: ForEachBinding, collection: any[]): void {
  for (let i = 0; i < binding.renderedElements.length; i++) {
    const item = collection[i]
    const rendered = binding.renderedElements[i]

    rendered.itemRef.current = item
    rendered.render()
  }
}

function renderSingleForEachBinding<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
): void {
  const collection = viewModel[binding.collectionName]

  if (!Array.isArray(collection)) {
    console.warn(
      `[pelela] for-each render: Property "${binding.collectionName}" is not an array, skipping render`,
    )
    return
  }

  const currentLength = collection.length
  const previousLength = binding.previousLength

  if (currentLength > previousLength) {
    addNewElements(binding, viewModel, collection, previousLength)
  } else if (currentLength < previousLength) {
    removeExtraElements(binding, currentLength)
  }

  updateExistingElements(binding, collection)

  binding.previousLength = currentLength
}

export function renderForEachBindings<T extends object>(
  bindings: ForEachBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleForEachBinding(binding, viewModel)
  }
}
