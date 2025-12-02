import { PelelaError } from "./PelelaError";

export type RegistrationType = "duplicate" | "missing";

const REGISTRATION_ERROR_MESSAGES: Record<
  RegistrationType,
  (viewModelName: string) => string
> = {
  duplicate: (name) => `[pelela] View model "${name}" is already registered`,
  missing: (name) =>
    `[pelela] View model "${name}" is not registered. Did you call defineViewModel?`
}

export class ViewModelRegistrationError extends PelelaError {
  constructor(
    public readonly viewModelName: string,
    public readonly type: RegistrationType,
  ) {
    super(REGISTRATION_ERROR_MESSAGES[type](viewModelName));
  }
}
