import { filterOwnElements, findAllElements } from '../commons/helpers'
import { t } from '../commons/i18n'
import { InvalidHandlerError } from '../errors/index'
import type { ViewModel } from './types'

function setupSingleEnterBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const handlerName = element.getAttribute('enter')
  if (!handlerName?.trim()) return

  if (element.tagName !== 'INPUT') {
    throw new Error(t('errors.compiler.enterOnlyForInput', { tag: element.tagName.toLowerCase() }))
  }

  element.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return

    const handler = viewModel[handlerName]

    if (typeof handler !== 'function') {
      throw new InvalidHandlerError(handlerName, viewModel.constructor?.name ?? 'Unknown', 'enter')
    }

    handler.call(viewModel, viewModel, event)
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
