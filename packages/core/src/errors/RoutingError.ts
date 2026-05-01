import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type RoutingErrorType = 'route-not-found' | 'component-not-registered' | 'router-not-started'

export const ROUTING_I18N_CODES: Record<RoutingErrorType, string> = {
  'route-not-found': 'errors.routing.routeNotFound',
  'component-not-registered': 'errors.routing.componentNotRegistered',
  'router-not-started': 'errors.routing.routerNotStarted',
} as const

const ROUTING_INTERPOLATION_KEYS: Record<RoutingErrorType, string> = {
  'route-not-found': 'path',
  'component-not-registered': 'name',
  'router-not-started': 'action',
}

export class RoutingError extends PelelaError {
  get i18nCode() {
    return ROUTING_I18N_CODES[this.type]
  }

  constructor(
    public readonly detail: string,
    public readonly type: RoutingErrorType,
    options?: ErrorOptions,
  ) {
    const interpolationKey = ROUTING_INTERPOLATION_KEYS[type]
    super(t(ROUTING_I18N_CODES[type], { [interpolationKey]: detail }), options)
  }
}
