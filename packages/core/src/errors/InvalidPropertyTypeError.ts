import { BindingKind } from ".";
import { PelelaError } from "./PelelaError";

export type ExpectedType =
  | "an array"
  | "a string"
  | "a number"
  | "a boolean"
  | "an object";

interface InvalidPropertyTypeErrorOptions {
  propertyName: string;
  bindingKind: BindingKind;
  expectedType: ExpectedType;
  viewModelName: string;
  elementSnippet: string;
  cause?: ErrorOptions;
}

export class InvalidPropertyTypeError extends PelelaError {
  public readonly propertyName: string;
  public readonly bindingKind: BindingKind;
  public readonly expectedType: ExpectedType;
  public readonly viewModelName: string;
  public readonly elementSnippet: string;

  constructor(options: InvalidPropertyTypeErrorOptions) {
    super(
      `[pelela] Property "${options.propertyName}" used in ${options.bindingKind} must be ${options.expectedType}, ` +
        `but found different type on view model "${options.viewModelName}". Element: ${options.elementSnippet}`,
      options.cause
    );

    this.propertyName = options.propertyName;
    this.bindingKind = options.bindingKind;
    this.expectedType = options.expectedType;
    this.viewModelName = options.viewModelName;
    this.elementSnippet = options.elementSnippet;
  }
}
