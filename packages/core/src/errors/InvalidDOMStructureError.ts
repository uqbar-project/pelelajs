import { t } from '../commons/i18n'
import type { BindingKind } from '.'
import { PelelaError } from './PelelaError'

export class InvalidDOMStructureError extends PelelaError {
  constructor(
    public readonly bindingKind: BindingKind,
    public readonly issue: string,
    options?: ErrorOptions,
  ) {
    super(
      t('errors.dom.invalidStructure', {
        kind: bindingKind,
        issue,
      }),
      options,
    )
  }
}
