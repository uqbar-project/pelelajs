import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

interface ForEachMethodScopeErrorParams {
  methodName: string
  viewModelName: string
  options?: ErrorOptions
}

export class ForEachMethodScopeError extends PelelaError {
  public readonly methodName: string
  public readonly viewModelName: string

  constructor(params: ForEachMethodScopeErrorParams) {
    super(
      t('errors.properties.forEachMethodScope', {
        name: params.methodName,
        viewModel: params.viewModelName,
      }),
      params.options,
    )

    this.methodName = params.methodName
    this.viewModelName = params.viewModelName
  }
}
