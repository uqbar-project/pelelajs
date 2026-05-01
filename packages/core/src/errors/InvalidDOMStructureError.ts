import { t } from '../commons/i18n'
import type { BindingKind } from '.'
import { PelelaError } from './PelelaError'

export class InvalidDOMStructureError extends PelelaError {
  static readonly I18N_CODE = 'errors.dom.invalidStructure' as const

  get i18nCode() {
    return InvalidDOMStructureError.I18N_CODE
  }

  constructor(
    public readonly bindingKind: BindingKind,
    public readonly issue: string,
    options?: ErrorOptions,
  ) {
    super(
      t(InvalidDOMStructureError.I18N_CODE, {
        kind: bindingKind,
        issue,
      }),
      options,
    )
  }
}
