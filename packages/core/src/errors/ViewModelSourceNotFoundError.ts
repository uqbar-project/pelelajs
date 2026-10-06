import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

interface ViewModelSourceNotFoundErrorParams {
  tsPath: string
  options?: ErrorOptions
}

/**
 * Thrown when the TypeScript program cannot load a view model source file, which
 * means the path handed to the analysis layer does not point at a readable module.
 */
export class ViewModelSourceNotFoundError extends PelelaError {
  public readonly tsPath: string

  constructor(params: ViewModelSourceNotFoundErrorParams) {
    super(t('errors.analysis.viewModelSourceNotFound', { path: params.tsPath }), params.options)

    this.tsPath = params.tsPath
  }
}
