import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export interface InvalidConstValueErrorParams {
  propertyName: string
  value: string
  expected: string
  componentTag: string
  viewModelName: string
  elementSnippet: string
}

export class InvalidConstValueError extends PelelaError {
  public readonly propertyName: string
  public readonly value: string
  public readonly expected: string
  public readonly componentTag: string
  public readonly viewModelName: string
  public readonly elementSnippet: string

  constructor(params: InvalidConstValueErrorParams) {
    super(
      t('errors.compiler.invalidConstValue', {
        name: params.propertyName,
        value: params.value,
        expected: params.expected,
        tag: params.componentTag,
        viewModel: params.viewModelName,
        snippet: params.elementSnippet,
      }),
    )
    this.name = 'InvalidConstValueError'

    this.propertyName = params.propertyName
    this.value = params.value
    this.expected = params.expected
    this.componentTag = params.componentTag
    this.viewModelName = params.viewModelName
    this.elementSnippet = params.elementSnippet
  }
}
