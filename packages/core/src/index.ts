export { bootstrap } from './bootstrap/bootstrap'
export { mountTemplate } from './bootstrap/mountTemplate'
export type { BindingKind, EventType, RegistrationType } from './errors/index'
export {
  InvalidHandlerError,
  PelelaError,
  PropertyValidationError,
  ViewModelRegistrationError,
} from './errors/index'
export { registerViewModel as defineViewModel } from './registry/viewModelRegistry'
export type { PelelaOptions, ViewModelConstructor } from './types'
