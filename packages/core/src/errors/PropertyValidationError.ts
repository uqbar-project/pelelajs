import { PelelaError } from "./PelelaError";

export type BindingKind = "bind-class" | "bind-value" | "bind-style" | "if";

export class PropertyValidationError extends PelelaError {
  constructor(
    public readonly propertyName: string,
    public readonly bindingKind: BindingKind,
    public readonly viewModelName: string,
    public readonly elementSnippet: string,
    options?: ErrorOptions
  ) {
    super(
      `[pelela] Unknown property "${propertyName}" used in ${bindingKind} on: ${elementSnippet}. ` +
        `Make sure your view model "${viewModelName}" defines it.`,
      options
    )
  }
}
