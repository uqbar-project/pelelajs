import { extractElementSnippet } from '../commons/helpers'
import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

function findKebabCaseSuggestion(tagName: string, registeredTags: string[]): string | undefined {
  const matchingTags = registeredTags.filter(
    (registeredTag) => registeredTag.replace(/-/g, '') === tagName,
  )

  return matchingTags.length === 1 ? matchingTags[0] : undefined
}

export class UnknownComponentError extends PelelaError {
  constructor(tagName: string, element: HTMLElement, registeredTags: string[] = []) {
    const suggestedTag = findKebabCaseSuggestion(tagName, registeredTags)

    super(
      suggestedTag
        ? t('errors.compiler.invalidComponentTagCase', {
            tag: tagName,
            suggestedTag,
          })
        : t('errors.compiler.unknownComponent', {
            tagName,
            snippet: extractElementSnippet(element),
          }),
    )
    this.name = 'UnknownComponentError'
  }
}
