import { t } from '../commons/i18n'
import type { BindingKind } from '.'
import { PelelaError } from './PelelaError'

export class InvalidBindingSyntaxError extends PelelaError {
  constructor(
    public readonly bindingKind: BindingKind,
    public readonly expression: string,
    public readonly expectedFormat: string,
    options?: ErrorOptions,
  ) {
    super(
      t('errors.bindings.invalidSyntax', {
        kind: bindingKind,
        expression,
        format: expectedFormat,
      }),
      options,
    )
  }
}
