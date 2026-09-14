import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'
import type { BindingKind } from './PropertyValidationError'

interface PropertyCaseMismatchErrorParams {
  propertyName: string
  bindingKind: BindingKind
  viewModelName: string
  elementSnippet: string
  suggestedName: string
  options?: ErrorOptions
}

export class PropertyCaseMismatchError extends PelelaError {
  public readonly propertyName: string
  public readonly bindingKind: BindingKind
  public readonly viewModelName: string
  public readonly elementSnippet: string
  public readonly suggestedName: string

  constructor(params: PropertyCaseMismatchErrorParams) {
    super(
      t('errors.properties.caseMismatch', {
        name: params.propertyName,
        viewModel: params.viewModelName,
        suggestedName: params.suggestedName,
      }),
      params.options,
    )

    this.propertyName = params.propertyName
    this.bindingKind = params.bindingKind
    this.viewModelName = params.viewModelName
    this.elementSnippet = params.elementSnippet
    this.suggestedName = params.suggestedName
  }
}
