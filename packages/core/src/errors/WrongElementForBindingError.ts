import { extractElementSnippet } from '../commons/helpers'
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
  public readonly tagName: string
  public readonly elementSnippet: string

  constructor(
    public readonly attributeName: string,
    element: HTMLElement,
    messageKey: BindingElementMessageKey,
  ) {
    const tagName = element.tagName.toLowerCase()
    const elementSnippet = extractElementSnippet(element)
    super(t(messageKey, { attributeName, tagName, snippet: elementSnippet }))
    this.tagName = tagName
    this.elementSnippet = elementSnippet
  }
}
