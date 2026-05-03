import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export class UnsupportedElementError extends PelelaError {
  constructor(
    public readonly tagName: string,
    public readonly elementSnippet: string,
    options?: ErrorOptions,
  ) {
    super(
      t('errors.bindings.value.invalidElement', {
        tagName,
        snippet: elementSnippet,
      }),
      options,
    )
  }
}
