import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export class ReadOnlyPropertyError extends PelelaError {
  constructor(
    public readonly propertyName: string,
    public readonly componentTag: string,
    public readonly viewModelName: string,
    public readonly elementSnippet: string,
  ) {
    super(
      t('errors.compiler.readOnlyProperty', {
        propertyName,
        tag: componentTag,
        viewModel: viewModelName,
        snippet: elementSnippet,
      }),
    )
    this.name = 'ReadOnlyPropertyError'
  }
}
