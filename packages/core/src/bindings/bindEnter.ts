import { debugLog, isDebugEnabled, nextEventId } from '../commons/debugState'
import { describeElement, filterOwnElements, findAllElements } from '../commons/helpers'

const style = {
  brand: 'color: #a78bfa; font-weight: 700',
  event: 'color: #60a5fa; font-weight: 700',
  muted: 'color: #8893a4',
  reset: 'color: inherit; font-weight: normal',
}

import { WrongElementForBindingError } from '../errors'
import { executeEventHandler } from './executeEventHandler'
import type { ViewModel } from './types'

function setupSingleEnterBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
  debug: boolean | undefined,
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

    if (debug || isDebugEnabled()) {
      const id = nextEventId()
      console.groupCollapsed(
        '%c[pelela]%c  #%d  %cENTER%c  %s',
        style.brand,
        style.reset,
        id,
        style.event,
        style.reset,
        describeElement(element),
      )
      try {
        console.log('%c  ↳ handler%c %s()', style.muted, style.reset, handlerName)
        executeEventHandler({ handlerName, viewModel, event, eventType: 'enter' })
      } finally {
        console.groupEnd()
      }
      return
    }
    executeEventHandler({ handlerName, viewModel, event, eventType: 'enter' })
  })
}

export function setupEnterBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
  { debug }: { debug?: boolean } = {},
): void {
  const elements = findAllElements(root, '[enter]')
  const ownElements = filterOwnElements(elements, root)

  ownElements.forEach((element) => {
    setupSingleEnterBinding(element, viewModel, debug)
  })
}
