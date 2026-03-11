import { InvalidHandlerError } from '../errors/index'
import { isInsideComponent, querySelectorAllInclusive } from './componentHelpers'
import type { ViewModel } from './types'

function setupSingleClickBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const handlerName = element.getAttribute('click')
  if (!handlerName || !handlerName.trim()) return

  element.addEventListener('click', (event) => {
    const handler = viewModel[handlerName]

    if (typeof handler !== 'function') {
      throw new InvalidHandlerError(handlerName, viewModel.constructor?.name ?? 'Unknown', 'click')
    }

    handler.call(viewModel, event)
  })
}

export function setupClickBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const elements = querySelectorAllInclusive(root, '[click]')

  for (const element of elements) {
    if (isInsideComponent(element, root)) {
      continue
    }
    setupSingleClickBinding(element, viewModel)
  }
}
