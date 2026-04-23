import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type RoutingErrorType = 'route-not-found' | 'component-not-registered'

const ROUTING_ERROR_METADATA: Record<
  RoutingErrorType,
  { messageKey: string; interpolationKey: string }
> = {
  'route-not-found': {
    messageKey: 'errors.routing.routeNotFound',
    interpolationKey: 'path',
  },
  'component-not-registered': {
    messageKey: 'errors.routing.componentNotRegistered',
    interpolationKey: 'name',
  },
}

export class RoutingError extends PelelaError {
  constructor(
    public readonly detail: string,
    public readonly type: RoutingErrorType,
    options?: ErrorOptions,
  ) {
    const { messageKey, interpolationKey } = ROUTING_ERROR_METADATA[type]
    super(t(messageKey, { [interpolationKey]: detail }), options)
  }
}
