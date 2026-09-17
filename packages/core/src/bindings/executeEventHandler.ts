import { renderErrorPage } from '../bootstrap/errorPage'
import { findCaseInsensitiveMember, isArrowFunctionMember, isObject } from '../commons/helpers'
import { isUnsafeKey } from '../commons/sanitization'
import {
  ArrowFunctionAsHandlerError,
  type EventType,
  GetterAsHandlerError,
  HandlerCaseMismatchError,
  InvalidHandlerError,
} from '../errors/index'
import type { EventHandler, ViewModel } from './types'

interface ExecuteEventHandlerOptions<T extends object, E extends Event> {
  handlerName: string
  viewModel: ViewModel<T>
  event: E
  eventType: EventType
}

interface ViewModelWithRaw {
  $raw?: unknown
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
  if (!(handlerName in viewModel)) return undefined
  return viewModel[handlerName]
}

/**
 * Detects whether the referenced member is a getter (e.g. `get totalCount()`) in the
 * view model or any prototype, unwrapping `$raw` first. Mirrors `dependencyTracker.isPropertyGetter`.
 */
function isGetterProperty(viewModel: object, propertyName: string): boolean {
  const rawViewModel: unknown = (viewModel as ViewModelWithRaw).$raw ?? viewModel
  if (!isObject(rawViewModel)) return false

  let proto: object | null = rawViewModel
  while (proto !== null && proto !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, propertyName)
    if (descriptor?.get) return true
    proto = Reflect.getPrototypeOf(proto)
  }
  return false
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
    const viewModelName = viewModel.constructor?.name ?? 'Unknown'

    if (isGetterProperty(viewModel, handlerName)) {
      throw new GetterAsHandlerError(handlerName, viewModelName, eventType)
    }

    const handler = getHandler(viewModel, handlerName)

    if (isEventHandler<T, E>(handler)) {
      if (isArrowFunctionMember(viewModel, handlerName, handler)) {
        throw new ArrowFunctionAsHandlerError(handlerName, viewModelName, eventType)
      }
      const handlerResult = handler.call(viewModel, viewModel, event)
      if (isPromiseLike(handlerResult)) {
        void Promise.resolve(handlerResult).catch(renderErrorPage)
      }
      return
    }

    const suggestedName = findPropertyOwner(viewModel, handlerName)
      ? null
      : findCaseInsensitiveMember(viewModel, handlerName)
    if (suggestedName) {
      throw new HandlerCaseMismatchError(handlerName, viewModelName, eventType, suggestedName)
    }

    throw new InvalidHandlerError(handlerName, viewModelName, eventType)
  } catch (error) {
    renderErrorPage(error)
  }
}
