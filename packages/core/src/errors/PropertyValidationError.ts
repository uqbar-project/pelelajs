import { PelelaError } from './PelelaError'

export type BindingKind = 'bind-class' | 'bind-value' | 'bind-content' | 'bind-style' | 'for-each' | 'if'

interface PropertyValidationErrorParams {
  propertyName: string
  bindingKind: BindingKind
  viewModelName: string
  elementSnippet: string
  options?: ErrorOptions
}

export class PropertyValidationError extends PelelaError {
  public readonly propertyName: string
  public readonly bindingKind: BindingKind
  public readonly viewModelName: string
  public readonly elementSnippet: string

  constructor(params: PropertyValidationErrorParams) {
    super(
      `[pelela] Unknown property "${params.propertyName}" used in ${params.bindingKind} on: ${params.elementSnippet}. ` +
        `Make sure your view model "${params.viewModelName}" defines it.`,
      params.options,
    )

    this.propertyName = params.propertyName
    this.bindingKind = params.bindingKind
    this.viewModelName = params.viewModelName
    this.elementSnippet = params.elementSnippet
  }
}
