import { extractElementSnippet } from '../commons/helpers'
import { InvalidBindingAttributeError } from '../errors'
import { isBindingAttribute } from './bindingAttributeUtils'

export function assertValidBindingAttribute(attributeName: string, element: Element): void {
  if (attributeName.startsWith('bind-') && !isBindingAttribute(attributeName)) {
    const elementSnippet = extractElementSnippet(element)
    throw new InvalidBindingAttributeError(attributeName, elementSnippet)
  }
}
