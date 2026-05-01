import { t } from '../commons/i18n'
import type { BindingKind } from '.'
import { PelelaError } from './PelelaError'

export class InvalidBindingSyntaxError extends PelelaError {
  static readonly I18N_CODE = 'errors.bindings.invalidSyntax' as const

  get i18nCode() {
    return InvalidBindingSyntaxError.I18N_CODE
  }

  constructor(
    public readonly bindingKind: BindingKind,
    public readonly expression: string,
    public readonly expectedFormat: string,
    options?: ErrorOptions,
  ) {
    super(
      t(InvalidBindingSyntaxError.I18N_CODE, {
        kind: bindingKind,
        expression,
        format: expectedFormat,
      }),
      options,
    )
  }
}
