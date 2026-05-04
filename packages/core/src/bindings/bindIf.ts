import { filterOwnElements, findAllElements } from '../commons/helpers'
import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty } from './nestedProperties'
import type { IfBinding, ViewModel } from './types'

function setupSingleIfBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): IfBinding | null {
  const propertyName = element.getAttribute('if')
  if (!propertyName?.trim()) return null

  assertViewModelProperty(viewModel, propertyName, 'if', element)

  return {
    element,
    propertyName,
    originalDisplay: element.style.display || '',
  }
}

export function setupIfBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
  skipRootElement = false,
): IfBinding[] {
  // When mounting a component child, the root element's 'if' belongs to the
  // parent view model. Callers can pass skipRootElement=true to exclude it.
  const elements = skipRootElement
    ? Array.from(root.querySelectorAll<HTMLElement>('[if]'))
    : findAllElements(root, '[if]')
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleIfBinding(element, viewModel))
    .filter((binding): binding is IfBinding => binding !== null)
}

function renderSingleIfBinding<T extends object>(
  binding: IfBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)
  const shouldShow = Boolean(value)

  binding.element.style.display = shouldShow ? binding.originalDisplay : 'none'
}

export function renderIfBindings<T extends object>(
  bindings: IfBinding[],
  viewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    renderSingleIfBinding(binding, viewModel)
  })
}
