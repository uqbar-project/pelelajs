import { t } from '../commons/i18n'
import type { EventType } from './InvalidHandlerError'
import { PelelaError } from './PelelaError'

/**
 * Thrown when an event (click/enter) references a method whose name only
 * differs in casing from an existing method of the view model. TypeScript
 * names are case-sensitive, so the mismatch is surfaced as a hint.
 */
export class HandlerCaseMismatchError extends PelelaError {
  // biome-ignore lint/complexity/useMaxParams: public readonly fields are the DX payload of this error type
  constructor(
    public readonly handlerName: string,
    public readonly viewModelName: string,
    public readonly eventType: EventType,
    public readonly suggestedName: string,
    options?: ErrorOptions,
  ) {
    const eventInfo = `${eventType}="..."`
    super(
      t('errors.handlers.caseMismatch', {
        name: handlerName,
        eventInfo,
        suggestedName,
      }),
      options,
    )
  }
}
