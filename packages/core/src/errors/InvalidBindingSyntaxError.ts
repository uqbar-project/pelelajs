import { BindingKind } from ".";
import { PelelaError } from "./PelelaError";

export class InvalidBindingSyntaxError extends PelelaError {
  constructor(
    public readonly bindingKind: BindingKind,
    public readonly expression: string,
    public readonly expectedFormat: string,
    options?: ErrorOptions
  ) {
    super(
      `[pelela] Invalid ${bindingKind} expression: "${expression}". Expected format: ${expectedFormat}`,
      options
    )
  }
}
