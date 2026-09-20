import { t } from '../commons/i18n'
import type { EventType } from './InvalidHandlerError'
import { PelelaError } from './PelelaError'

/**
 * Thrown when an event (click/enter) references a member of the view model
 * declared as an arrow function field. Arrow functions are not allowed as view
 * model members: the handler must be declared as a regular method instead.
 */
export class ArrowFunctionAsHandlerError extends PelelaError {
  constructor(
    public readonly handlerName: string,
    public readonly viewModelName: string,
    eventType?: EventType,
    options?: ErrorOptions,
  ) {
    const eventInfo = eventType ? `${eventType}="..."` : t('errors.handlers.unknownEvent')
    super(
      t('errors.handlers.isArrow', {
        name: handlerName,
        viewModel: viewModelName,
        eventInfo,
      }),
      options,
    )
  }
}
