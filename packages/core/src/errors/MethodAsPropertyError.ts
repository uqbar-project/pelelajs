import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'
import type { BindingKind } from './PropertyValidationError'

interface MethodAsPropertyErrorParams {
  propertyName: string
  bindingKind: BindingKind
  viewModelName: string
  elementSnippet: string
  options?: ErrorOptions
}

export class MethodAsPropertyError extends PelelaError {
  public readonly propertyName: string
  public readonly bindingKind: BindingKind
  public readonly viewModelName: string
  public readonly elementSnippet: string

  constructor(params: MethodAsPropertyErrorParams) {
    super(
      t('errors.properties.isMethod', {
        name: params.propertyName,
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
