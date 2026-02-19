import { PelelaError } from './PelelaError'

export type PropErrorType = 'missing' | 'invalid-link'

const PROP_ERROR_MESSAGES: Record<
  PropErrorType,
  (componentName: string, propName: string, parentViewModel: string) => string
> = {
  missing: (component, prop, parent) =>
    `Property "${prop}" does not exist in parent ViewModel "${parent}" but is required by component "${component}"`,
  'invalid-link': (component, prop, parent) =>
    `Bidirectional prop "link-${prop}" references non-existent property "${prop}" in parent ViewModel "${parent}" for component "${component}"`,
}

export class InvalidComponentPropError extends PelelaError {
  constructor(
    public readonly componentName: string,
    public readonly propName: string,
    public readonly parentViewModelName: string,
    public readonly type: PropErrorType,
    public readonly elementSnippet: string,
    options?: ErrorOptions,
  ) {
    const message = `[pelela] ${PROP_ERROR_MESSAGES[type](componentName, propName, parentViewModelName)}

Element: ${elementSnippet.substring(0, 100)}${elementSnippet.length > 100 ? '...' : ''}

Suggestion: Check that the parent ViewModel has the property "${propName}" defined.`

    super(message, options)
  }
}

