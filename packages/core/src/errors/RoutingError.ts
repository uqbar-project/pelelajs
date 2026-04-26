import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type RoutingErrorType = 'route-not-found' | 'component-not-registered' | 'router-not-started'

const ROUTING_I18N_KEYS: Record<RoutingErrorType, string> = {
  'route-not-found': 'errors.routing.routeNotFound',
  'component-not-registered': 'errors.routing.componentNotRegistered',
  'router-not-started': 'errors.routing.routerNotStarted',
}

const ROUTING_INTERPOLATION_KEYS: Record<RoutingErrorType, string> = {
  'route-not-found': 'path',
  'component-not-registered': 'name',
  'router-not-started': 'action',
}

export class RoutingError extends PelelaError {
  constructor(
    public readonly detail: string,
    public readonly type: RoutingErrorType,
    options?: ErrorOptions,
  ) {
    const interpolationKey = ROUTING_INTERPOLATION_KEYS[type]
    super(t(ROUTING_I18N_KEYS[type], { [interpolationKey]: detail }), options)
  }
}
