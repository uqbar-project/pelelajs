import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'
import type { BindingKind } from './PropertyValidationError'

interface ArrowFunctionAsPropertyErrorParams {
  propertyName: string
  bindingKind: BindingKind
  viewModelName: string
  elementSnippet: string
  options?: ErrorOptions
}

/**
 * Thrown when a binding references a member of the view model declared as an
 * arrow function field. Arrow functions are not allowed as view model members:
 * the bindable value must be declared as a plain property or a getter instead.
 */
export class ArrowFunctionAsPropertyError extends PelelaError {
  public readonly propertyName: string
  public readonly bindingKind: BindingKind
  public readonly viewModelName: string
  public readonly elementSnippet: string

  constructor(params: ArrowFunctionAsPropertyErrorParams) {
    super(
      t('errors.properties.isArrow', {
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
