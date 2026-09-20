import { t } from '../commons/i18n'
import type { EventType } from './InvalidHandlerError'
import { PelelaError } from './PelelaError'

/**
 * Thrown when an event references a plain property of the view model (e.g.
 * `counter = 0`) instead of a method. Events must invoke callable methods;
 * property values are data, not handlers.
 */
export class PropertyAsHandlerError extends PelelaError {
  constructor(
    public readonly handlerName: string,
    public readonly viewModelName: string,
    eventType?: EventType,
    options?: ErrorOptions,
  ) {
    const eventInfo = eventType ? `${eventType}="..."` : t('errors.handlers.unknownEvent')
    super(
      t('errors.handlers.isProperty', {
        name: handlerName,
        viewModel: viewModelName,
        eventInfo,
      }),
      options,
    )
  }
}
