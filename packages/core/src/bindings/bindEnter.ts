import { extractElementSnippet, filterOwnElements, findAllElements } from '../commons/helpers'
import { WrongElementForBindingError } from '../errors'
import { executeEventHandler } from './executeEventHandler'
import type { ViewModel } from './types'

function setupSingleEnterBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const handlerName = element.getAttribute('enter')
  if (!handlerName?.trim()) return

  if (element.tagName !== 'INPUT') {
    throw new WrongElementForBindingError(
      'enter',
      element.tagName.toLowerCase(),
      extractElementSnippet(element),
      'errors.compiler.enterOnlyForInput',
    )
  }

  element.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return

    executeEventHandler({ handlerName, viewModel, event, eventType: 'enter' })
  })
}

export function setupEnterBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const elements = findAllElements(root, '[enter]')
  const ownElements = filterOwnElements(elements, root)

  ownElements.forEach((element) => {
    setupSingleEnterBinding(element, viewModel)
  })
}
