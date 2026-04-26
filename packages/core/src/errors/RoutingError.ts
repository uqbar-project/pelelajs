import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type RoutingErrorType =
  | 'route-not-found'
  | 'route-not-absolute'
  | 'router-not-started'
  | 'component-not-registered'
  | 'component-class-not-found'
  | 'template-not-found'
  | 'auto-registration-failed'

const ROUTING_ERROR_METADATA: Record<
  RoutingErrorType,
  { messageKey: string; interpolationKey: string }
> = {
  'route-not-found': {
    messageKey: 'errors.routing.routeNotFound',
    interpolationKey: 'path',
  },
  'route-not-absolute': {
    messageKey: 'errors.routing.routeNotAbsolute',
    interpolationKey: 'path',
  },
  'router-not-started': {
    messageKey: 'errors.routing.routerNotStarted',
    interpolationKey: 'method',
  },
  'component-not-registered': {
    messageKey: 'errors.routing.componentNotRegistered',
    interpolationKey: 'name',
  },
  'component-class-not-found': {
    messageKey: 'errors.routing.componentClassNotFound',
    interpolationKey: 'name',
  },
  'template-not-found': {
    messageKey: 'errors.routing.templateNotFound',
    interpolationKey: 'name',
  },
  'auto-registration-failed': {
    messageKey: 'errors.routing.autoRegistrationFailed',
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
