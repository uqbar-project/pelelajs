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

    handler.call(viewModel, viewModel, event)
  })
}

export function setupClickBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  // Check the root element itself
  setupSingleClickBinding(root, viewModel)

  // Check descendants
  const elements = root.querySelectorAll<HTMLElement>('[click]')

  elements.forEach((element) => {
    setupSingleClickBinding(element, viewModel)
  })
}
