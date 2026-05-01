import { t } from '../commons/i18n'
import type { BindingKind } from '.'
import { PelelaError } from './PelelaError'

export type ExpectedType = 'an array' | 'a string' | 'a number' | 'a boolean' | 'an object'

interface InvalidPropertyTypeErrorParams {
  propertyName: string
  bindingKind: BindingKind
  expectedType: ExpectedType
  viewModelName: string
  elementSnippet: string
  options?: ErrorOptions
}

export class InvalidPropertyTypeError extends PelelaError {
  static readonly I18N_CODE = 'errors.properties.invalidType' as const

  get i18nCode() {
    return InvalidPropertyTypeError.I18N_CODE
  }

  public readonly propertyName: string
  public readonly bindingKind: BindingKind
  public readonly expectedType: ExpectedType
  public readonly viewModelName: string
  public readonly elementSnippet: string

  constructor(params: InvalidPropertyTypeErrorParams) {
    super(
      t(InvalidPropertyTypeError.I18N_CODE, {
        name: params.propertyName,
        kind: params.bindingKind,
        expected: params.expectedType,
        viewModel: params.viewModelName,
        snippet: params.elementSnippet,
      }),
      params.options,
    )

    this.propertyName = params.propertyName
    this.bindingKind = params.bindingKind
    this.expectedType = params.expectedType
    this.viewModelName = params.viewModelName
    this.elementSnippet = params.elementSnippet
  }
}
