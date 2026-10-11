import { filterOwnElements, findAllElements } from '../commons/helpers'
import { resolveBindingValue } from './forEachMethodBinding'
import { setupSingleBinding } from './setupSingleBinding'
import type { IfBinding, ViewModel } from './types'

function setupSingleIfBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): IfBinding | null {
  return setupSingleBinding(element, viewModel, 'if', (base) => ({
    ...base,
    originalDisplay: element.style.display || '',
  }))
}

export function setupIfBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
  skipRootElement = false,
): IfBinding[] {
  const elements = findAllElements(root, '[if]', !skipRootElement)
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleIfBinding(element, viewModel))
    .filter((binding): binding is IfBinding => binding !== null)
}

function renderSingleIfBinding<T extends object>(
  binding: IfBinding,
  viewModel: ViewModel<T>,
): void {
  const value = resolveBindingValue(viewModel, binding)
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
