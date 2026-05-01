import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export class UnsupportedElementError extends PelelaError {
  static readonly I18N_CODE = 'errors.bindings.value.invalidElement' as const

  get i18nCode() {
    return UnsupportedElementError.I18N_CODE
  }

  constructor(
    public readonly tagName: string,
    public readonly elementSnippet: string,
    options?: ErrorOptions,
  ) {
    super(
      t(UnsupportedElementError.I18N_CODE, {
        tagName,
        snippet: elementSnippet,
      }),
      options,
    )
  }
}
