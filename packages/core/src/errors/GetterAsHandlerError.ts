import { t } from '../commons/i18n'
import type { EventType } from './InvalidHandlerError'
import { PelelaError } from './PelelaError'

/**
 * Thrown when an event (click/enter) references a getter of the view model
 * instead of a method. Getters expose derived values, not callable logic,
 * so the handler name must be converted into a plain method.
 */
export class GetterAsHandlerError extends PelelaError {
  constructor(
    public readonly handlerName: string,
    public readonly viewModelName: string,
    eventType?: EventType,
    options?: ErrorOptions,
  ) {
    const eventInfo = eventType ? `${eventType}="..."` : t('errors.handlers.unknownEvent')
    super(
      t('errors.handlers.isGetter', {
        name: handlerName,
        viewModel: viewModelName,
        eventInfo,
      }),
      options,
    )
  }
}
