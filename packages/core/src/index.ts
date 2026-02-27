export { bootstrap } from './bootstrap/bootstrap'
export { mountTemplate } from './bootstrap/mountTemplate'
export type { BindingKind, EventType, PropErrorType, RegistrationType } from './errors/index'
export {
  CircularComponentError,
  ComponentNotFoundError,
  InvalidComponentPropError,
  InvalidHandlerError,
  PelelaError,
  PropertyValidationError,
  ViewModelRegistrationError,
} from './errors/index'
export { registerComponent as defineComponent } from './registry/componentRegistry'
export { registerViewModel as defineViewModel } from './registry/viewModelRegistry'
export type { ComponentConfig, ComponentProps, PelelaOptions, ViewModelConstructor } from './types'
