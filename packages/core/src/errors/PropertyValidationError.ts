import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export type BindingKind =
  | 'bind-class'
  | 'bind-value'
  | 'bind-content'
  | 'bind-style'
  | 'for-each'
  | 'if'

interface PropertyValidationErrorParams {
  propertyName: string
  bindingKind: BindingKind
  viewModelName: string
  elementSnippet: string
  options?: ErrorOptions
}

export class PropertyValidationError extends PelelaError {
  public readonly propertyName: string
  public readonly bindingKind: BindingKind
  public readonly viewModelName: string
  public readonly elementSnippet: string

  constructor(params: PropertyValidationErrorParams) {
    super(
      t('errors.properties.validation', {
        name: params.propertyName,
        kind: params.bindingKind,
        snippet: params.elementSnippet,
        viewModel: params.viewModelName,
      }),
      params.options,
    )

    this.propertyName = params.propertyName
    this.bindingKind = params.bindingKind
    this.viewModelName = params.viewModelName
    this.elementSnippet = params.elementSnippet
  }
}
