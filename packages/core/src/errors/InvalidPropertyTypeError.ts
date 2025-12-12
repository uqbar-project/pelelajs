import type { BindingKind } from ".";
import { PelelaError } from "./PelelaError";

export type ExpectedType =
  | "an array"
  | "a string"
  | "a number"
  | "a boolean"
  | "an object";

interface InvalidPropertyTypeErrorParams {
  propertyName: string;
  bindingKind: BindingKind;
  expectedType: ExpectedType;
  viewModelName: string;
  elementSnippet: string;
  options?: ErrorOptions;
}

export class InvalidPropertyTypeError extends PelelaError {
  public readonly propertyName: string;
  public readonly bindingKind: BindingKind;
  public readonly expectedType: ExpectedType;
  public readonly viewModelName: string;
  public readonly elementSnippet: string;

  constructor(params: InvalidPropertyTypeErrorParams) {
    super(
      `[pelela] Property "${params.propertyName}" used in ${params.bindingKind} must be ${params.expectedType}, ` +
        `but found different type on view model "${params.viewModelName}". Element: ${params.elementSnippet}`,
      params.options
    );

    this.propertyName = params.propertyName;
    this.bindingKind = params.bindingKind;
    this.expectedType = params.expectedType;
    this.viewModelName = params.viewModelName;
    this.elementSnippet = params.elementSnippet;
  }
}
