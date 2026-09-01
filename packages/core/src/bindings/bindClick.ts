import { filterOwnElements, findAllElements } from '../commons/helpers'
import { executeEventHandler } from './executeEventHandler'
import type { ViewModel } from './types'

function setupSingleClickBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const handlerName = element.getAttribute('click')
  if (!handlerName?.trim()) return

  element.addEventListener('click', (event) => {
    executeEventHandler({ handlerName, viewModel, event, eventType: 'click' })
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
