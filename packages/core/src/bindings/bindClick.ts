import { debugLog, isDebugEnabled, nextEventId } from '../commons/debugState'
import { describeElement, filterOwnElements, findAllElements } from '../commons/helpers'

const style = {
  brand: 'color: #a78bfa; font-weight: 700',
  event: 'color: #60a5fa; font-weight: 700',
  muted: 'color: #8893a4',
  reset: 'color: inherit; font-weight: normal',
}

import { executeEventHandler } from './executeEventHandler'
import type { ViewModel } from './types'

function setupSingleClickBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
  debug: boolean | undefined,
): void {
  const handlerName = element.getAttribute('click')
  if (!handlerName?.trim()) return

  debugLog(debug, 'debug.uiEventRegistered', {
    element,
    kind: 'click',
    handler: handlerName,
  })

  element.addEventListener('click', (event) => {
    if (debug || isDebugEnabled()) {
      const id = nextEventId()
      console.groupCollapsed(
        '%c[pelela]%c  #%d  %cCLICK%c  %s',
        style.brand,
        style.reset,
        id,
        style.event,
        style.reset,
        describeElement(element),
      )
      try {
        console.log('%c  ↳ handler%c %s()', style.muted, style.reset, handlerName)
        executeEventHandler({ handlerName, viewModel, event, eventType: 'click' })
      } finally {
        console.groupEnd()
      }
      return
    }
    executeEventHandler({ handlerName, viewModel, event, eventType: 'click' })
  })
}

export function setupClickBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
  { debug }: { debug?: boolean } = {},
): void {
  const elements = findAllElements(root, '[click]')
  const ownElements = filterOwnElements(elements, root)

  ownElements.forEach((element) => {
    setupSingleClickBinding(element, viewModel, debug)
  })
}
