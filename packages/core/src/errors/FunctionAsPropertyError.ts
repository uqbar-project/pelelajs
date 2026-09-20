import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'
import type { BindingKind } from './PropertyValidationError'

interface FunctionAsPropertyErrorParams {
  propertyName: string
  bindingKind: BindingKind
  viewModelName: string
  elementSnippet: string
  options?: ErrorOptions
}

/**
 * Thrown when a binding resolves to a function value that is not a method of the
 * view model: a getter returning a function, an instance function field or a
 * nested function. Only plain (non-function) values are bindable properties.
 */
export class FunctionAsPropertyError extends PelelaError {
  public readonly propertyName: string
  public readonly bindingKind: BindingKind
  public readonly viewModelName: string
  public readonly elementSnippet: string

  constructor(params: FunctionAsPropertyErrorParams) {
    super(
      t('errors.properties.isFunction', {
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
