export { bootstrap } from './bootstrap/bootstrap'
export { mountTemplate } from './bootstrap/mountTemplate'
export type { BindingKind, EventType, RegistrationType, RoutingErrorType } from './errors/index'
export {
  InvalidHandlerError,
  PelelaError,
  PropertyValidationError,
  RoutingError,
  ViewModelRegistrationError,
} from './errors/index'
export { registerViewModel as defineViewModel } from './registry/viewModelRegistry'
export type { RouteDefinition } from './router/index'
export { defineComponent, router } from './router/index'
export type { PelelaOptions, ViewModelConstructor } from './types'
