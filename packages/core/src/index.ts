export type { ViewModelConstructor, PelelaOptions } from "./types";
export { bootstrap } from "./bootstrap/bootstrap";
export { mountTemplate } from "./bootstrap/mountTemplate";
export { registerViewModel as defineViewModel } from "./registry/viewModelRegistry";
export {
  PelelaError,
  PropertyValidationError,
  RegistrationError,
  InvalidHandlerError,
} from "./errors/index";
export type { BindingKind, RegistrationType, EventType } from "./errors/index";
