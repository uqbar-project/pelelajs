import { filterOwnElements, findAllElements } from '../commons/helpers'
import { InvalidHandlerError } from '../errors/index'
import type { ViewModel } from './types'

function setupSingleClickBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const handlerName = element.getAttribute('click')
  if (!handlerName?.trim()) return

  element.addEventListener('click', (event) => {
    const handler = viewModel[handlerName]

    if (typeof handler !== 'function') {
      throw new InvalidHandlerError(handlerName, viewModel.constructor?.name ?? 'Unknown', 'click')
    }

    // Pass viewModel as both this-context and first argument to support two handler styles:
    // - Method-style handlers that use `this` (function() { this.value })
    // - Function/property-style handlers that accept (vm, ev) => vm.value
    // This is deliberate to avoid future confusion
    handler.call(viewModel, viewModel, event)
  })
}

export function setupClickBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const elements = findAllElements(root, '[click]')
  const ownElements = filterOwnElements(elements, root)

  ownElements.forEach((element) => {
    setupSingleClickBinding(element, viewModel)
  })
}
