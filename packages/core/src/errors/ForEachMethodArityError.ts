import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'
import type { BindingKind } from './PropertyValidationError'

interface ForEachMethodArityErrorParams {
  methodName: string
  bindingKind: BindingKind
  viewModelName: string
  elementSnippet: string
  actualParams: number
  options?: ErrorOptions
}

export class ForEachMethodArityError extends PelelaError {
  public readonly methodName: string
  public readonly bindingKind: BindingKind
  public readonly viewModelName: string
  public readonly elementSnippet: string
  public readonly actualParams: number

  constructor(params: ForEachMethodArityErrorParams) {
    super(
      t('errors.properties.forEachMethodArity', {
        name: params.methodName,
        count: params.actualParams,
        viewModel: params.viewModelName,
        snippet: params.elementSnippet,
      }),
      params.options,
    )

    this.methodName = params.methodName
    this.bindingKind = params.bindingKind
    this.viewModelName = params.viewModelName
    this.elementSnippet = params.elementSnippet
    this.actualParams = params.actualParams
  }
}
