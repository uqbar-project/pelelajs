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
  static readonly I18N_CODE = 'errors.properties.validation' as const

  get i18nCode() {
    return PropertyValidationError.I18N_CODE
  }

  public readonly propertyName: string
  public readonly bindingKind: BindingKind
  public readonly viewModelName: string
  public readonly elementSnippet: string

  constructor(params: PropertyValidationErrorParams) {
    super(
      t(PropertyValidationError.I18N_CODE, {
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
