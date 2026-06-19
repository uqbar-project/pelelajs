import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export class InvalidBindingAttributeError extends PelelaError {
  constructor(
    public readonly attributeName: string,
    public readonly elementSnippet: string,
  ) {
    super(
      t('errors.bindings.invalidBindingAttribute', {
        attributeName,
        elementSnippet,
      }),
    )
    this.name = 'InvalidBindingAttributeError'
  }
}
