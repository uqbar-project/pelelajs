import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type EventType = 'click' | 'submit' | 'change' | 'input' | 'keypress' | (string & {})

export class InvalidHandlerError extends PelelaError {
  constructor(
    public readonly handlerName: string,
    public readonly viewModelName: string,
    public readonly eventType?: EventType,
    options?: ErrorOptions,
  ) {
    const eventInfo = eventType ? `${eventType}="..."` : 'an event handler'
    super(
      t('errors.handlers.invalid', {
        name: handlerName,
        eventInfo,
        viewModel: viewModelName,
      }),
      options,
    )
  }
}
