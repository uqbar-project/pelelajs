import { debugLog, isDebugEnabled } from '../commons/debugState'
import { filterOwnElements, findAllElements } from '../commons/helpers'
import { WrongElementForBindingError } from '../errors'
import { executeEventHandler } from './executeEventHandler'
import type { ViewModel } from './types'

function setupSingleEnterBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
  debug: boolean,
): void {
  const handlerName = element.getAttribute('enter')
  if (!handlerName?.trim()) return

  if (element.tagName !== 'INPUT') {
    throw new WrongElementForBindingError('enter', element, 'errors.compiler.enterOnlyForInput')
  }

  debugLog(debug, 'debug.uiEventRegistered', {
    element,
    kind: 'enter',
    handler: handlerName,
  })

  element.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return

    debugLog(debug, 'debug.uiEventDispatched', {
      kind: 'enter',
      element,
      handler: handlerName,
    })
    executeEventHandler({ handlerName, viewModel, event, eventType: 'enter' })
  })
}

export function setupEnterBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
  { debug = false }: { debug?: boolean } = {},
): void {
  const elements = findAllElements(root, '[enter]')
  const ownElements = filterOwnElements(elements, root)

  const isDebug = debug || isDebugEnabled()
  ownElements.forEach((element) => {
    setupSingleEnterBinding(element, viewModel, isDebug)
  })
}
