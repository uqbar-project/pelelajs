import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type BindingElementMessageKey =
  | 'errors.bindings.value.invalidElement'
  | 'errors.bindings.content.invalidElement'
  | 'errors.bindings.srcOnlyForImg'
  | 'errors.bindings.altOnlyForImg'
  | 'errors.bindings.enabledOnlyForFormControls'
  | 'errors.compiler.enterOnlyForInput'

export class WrongElementForBindingError extends PelelaError {
  constructor(
    public readonly attributeName: string,
    public readonly tagName: string,
    public readonly elementSnippet: string,
    messageKey: BindingElementMessageKey,
  ) {
    super(
      t(messageKey, {
        attributeName,
        tagName,
        snippet: elementSnippet,
      }),
    )
  }
}
