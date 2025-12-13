import type { BindingKind } from '.'
import { PelelaError } from './PelelaError'

export class InvalidDOMStructureError extends PelelaError {
  constructor(
    public readonly bindingKind: BindingKind,
    public readonly issue: string,
    options?: ErrorOptions,
  ) {
    super(`[pelela] ${bindingKind}: Cannot setup binding, ${issue}`, options)
  }
}
