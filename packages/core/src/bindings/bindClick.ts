import { debugLog, isDebugEnabled } from '../commons/debugState'
import { filterOwnElements, findAllElements } from '../commons/helpers'
import { executeEventHandler } from './executeEventHandler'
import type { ViewModel } from './types'

function setupSingleClickBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
  debug: boolean,
): void {
  const handlerName = element.getAttribute('click')
  if (!handlerName?.trim()) return

  debugLog(debug, 'debug.uiEventRegistered', {
    element,
    kind: 'click',
    handler: handlerName,
  })

  element.addEventListener('click', (event) => {
    debugLog(debug, 'debug.uiEventDispatched', {
      kind: 'click',
      element,
      handler: handlerName,
    })
    executeEventHandler({ handlerName, viewModel, event, eventType: 'click' })
  })
}

export function setupClickBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
  { debug = false }: { debug?: boolean } = {},
): void {
  const elements = findAllElements(root, '[click]')
  const ownElements = filterOwnElements(elements, root)

  const isDebug = debug || isDebugEnabled()
  ownElements.forEach((element) => {
    setupSingleClickBinding(element, viewModel, isDebug)
  })
}
