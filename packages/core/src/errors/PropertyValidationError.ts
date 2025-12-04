import { PelelaError } from "./PelelaError";

export type BindingKind = "bind-class" | "bind-value" | "bind-style" | 'for-each' | "if";

interface PropertyValidationErrorOptions {
  propertyName: string;
  bindingKind: BindingKind;
  viewModelName: string;
  elementSnippet: string;
  cause?: unknown;
}

export class PropertyValidationError extends PelelaError {
  public readonly propertyName: string;
  public readonly bindingKind: BindingKind;
  public readonly viewModelName: string;
  public readonly elementSnippet: string;

  constructor(options: PropertyValidationErrorOptions) {
    super(
      `[pelela] Unknown property "${options.propertyName}" used in ${options.bindingKind} on: ${options.elementSnippet}. ` +
        `Make sure your view model "${options.viewModelName}" defines it.`,
      options.cause ? { cause: options.cause } : undefined
    );

    this.propertyName = options.propertyName;
    this.bindingKind = options.bindingKind;
    this.viewModelName = options.viewModelName;
    this.elementSnippet = options.elementSnippet;
  }
}
