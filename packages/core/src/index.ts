export { bootstrap } from './bootstrap/bootstrap'
export { mountTemplate } from './bootstrap/mountTemplate'
export type { BindingKind, EventType, RegistrationType, PropErrorType } from './errors/index'
export {
  CircularComponentError,
  ComponentNotFoundError,
  InvalidComponentPropError,
  InvalidHandlerError,
  PelelaError,
  PropertyValidationError,
  ViewModelRegistrationError,
} from './errors/index'
export { registerViewModel as defineViewModel } from './registry/viewModelRegistry'
export { registerComponent as defineComponent } from './registry/componentRegistry'
export type { PelelaOptions, ViewModelConstructor, ComponentConfig, ComponentProps } from './types'
