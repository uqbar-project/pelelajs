import { renderErrorPage } from '../bootstrap/errorPage'
import { isUnsafeKey } from '../commons/sanitization'
import { type EventType, InvalidHandlerError } from '../errors/index'
import type { EventHandler, ViewModel } from './types'

interface ExecuteEventHandlerOptions<T extends object, E extends Event> {
  handlerName: string
  viewModel: ViewModel<T>
  event: E
  eventType: EventType
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return false
  return 'then' in value && typeof value.then === 'function'
}

function isEventHandler<T extends object, E extends Event>(
  candidate: unknown,
): candidate is EventHandler<T, E> {
  return typeof candidate === 'function'
}

function findPropertyOwner(target: object | null, propertyName: string): object | undefined {
  if (!target || target === Object.prototype) return undefined
  if (Object.hasOwn(target, propertyName)) return target
  return findPropertyOwner(Reflect.getPrototypeOf(target), propertyName)
}

function getHandler<T extends object>(viewModel: ViewModel<T>, handlerName: string): unknown {
  if (isUnsafeKey(handlerName)) return undefined
  const propertyOwner = findPropertyOwner(viewModel, handlerName)
  if (!propertyOwner) return undefined
  return viewModel[handlerName]
}

/**
 * Keeps both supported handler styles: methods use the ViewModel as `this`, while
 * functions can receive it explicitly as their first argument.
 */
export function executeEventHandler<T extends object, E extends Event>({
  handlerName,
  viewModel,
  event,
  eventType,
}: ExecuteEventHandlerOptions<T, E>): void {
  try {
    const handler = getHandler(viewModel, handlerName)

    if (!isEventHandler<T, E>(handler)) {
      throw new InvalidHandlerError(
        handlerName,
        viewModel.constructor?.name ?? 'Unknown',
        eventType,
      )
    }

    const handlerResult = handler.call(viewModel, viewModel, event)
    if (isPromiseLike(handlerResult)) {
      void Promise.resolve(handlerResult).catch(renderErrorPage)
    }
  } catch (error) {
    renderErrorPage(error)
  }
}
