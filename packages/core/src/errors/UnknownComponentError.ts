import { extractElementSnippet, findUniqueCollapsedTag } from '../commons/helpers'
import { t } from '../commons/i18n'
import { PelelaError } from './PelelaError'

export class UnknownComponentError extends PelelaError {
  constructor(tagName: string, element: HTMLElement, registeredTags: string[] = []) {
    const suggestedTag = findUniqueCollapsedTag(tagName, registeredTags)

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
