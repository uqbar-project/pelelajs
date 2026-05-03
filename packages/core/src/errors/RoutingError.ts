import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type RoutingErrorType = 'route-not-found' | 'component-not-registered' | 'router-not-started'

const routingMessageBuilders = {
  'route-not-found': (detail: string) => t('errors.routing.routeNotFound', { path: detail }),
  'component-not-registered': (detail: string) =>
    t('errors.routing.componentNotRegistered', { name: detail }),
  'router-not-started': (detail: string) =>
    t('errors.routing.routerNotStarted', { action: detail }),
} as const satisfies Record<RoutingErrorType, (detail: string) => string>

export class RoutingError extends PelelaError {
  constructor(
    public readonly detail: string,
    public readonly type: RoutingErrorType,
    options?: ErrorOptions,
  ) {
    super(routingMessageBuilders[type](detail), options)
  }
}
