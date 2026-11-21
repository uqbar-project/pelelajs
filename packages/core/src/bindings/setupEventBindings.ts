import { debugLog, isDebugEnabled, nextEventId } from '../commons/debugState'
import { describeElement, filterOwnElements, findAllElements } from '../commons/helpers'
import { executeEventHandler } from './executeEventHandler'
import type { ViewModel } from './types'

const style = {
  brand: 'color: #a78bfa; font-weight: 700',
  event: 'color: #60a5fa; font-weight: 700',
  muted: 'color: #8893a4',
  reset: 'color: inherit; font-weight: normal',
}

type EventBindingConfig<E extends Event> = {
  bindingName: string
  domEventName: keyof HTMLElementEventMap
  debugLabel: string
  validateElement?: (element: HTMLElement) => void
  shouldHandleEvent?: (event: E) => boolean
}

/**
 * Event bindings differ only in their attribute, DOM event and a couple of guards.
 * Keeping those differences as configuration avoids duplicating listener setup,
 * debug logging and cleanup in every binding module.
 */
export function createEventBindingSetup<E extends Event>({
  bindingName,
  domEventName,
  debugLabel,
  validateElement,
  shouldHandleEvent,
}: EventBindingConfig<E>) {
  return function setupEventBindings<T extends object>(
    root: HTMLElement,
    viewModel: ViewModel<T>,
    { debug }: { debug?: boolean } = {},
  ): () => void {
    const elements = findAllElements(root, `[${bindingName}]`)
    const ownElements = filterOwnElements(elements, root)

    const removeListeners = ownElements
      .map((element) => {
        const handlerName = element.getAttribute(bindingName)
        if (!handlerName?.trim()) return undefined

        validateElement?.(element)

        debugLog(debug, 'debug.uiEventRegistered', {
          element,
          kind: bindingName,
          handler: handlerName,
        })

        const listener: EventListener = (rawEvent) => {
          const event = rawEvent as E
          if (shouldHandleEvent && !shouldHandleEvent(event)) return

          if (isDebugEnabled(debug)) {
            const id = nextEventId()
            console.groupCollapsed(
              '%c[pelela]%c  #%d  %c%s%c  %s',
              style.brand,
              style.reset,
              id,
              style.event,
              debugLabel,
              style.reset,
              describeElement(element),
            )
            try {
              console.log('%c  ↳ handler%c %s()', style.muted, style.reset, handlerName)
              executeEventHandler({ handlerName, viewModel, event, eventType: bindingName })
            } finally {
              console.groupEnd()
            }
            return
          }
          executeEventHandler({ handlerName, viewModel, event, eventType: bindingName })
        }

        element.addEventListener(domEventName, listener)
        return () => element.removeEventListener(domEventName, listener)
      })
      .filter((remover): remover is () => void => remover !== undefined)

    return () => {
      removeListeners.forEach((remover) => {
        remover()
      })
    }
  }
}
