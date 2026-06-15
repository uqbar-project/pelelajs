import { isBindingAttribute } from '../bindings/bindForEach'
import { extractElementSnippet } from '../commons/helpers'
import { InvalidBindingAttributeError } from '../errors'

export function assertValidBindingAttribute(attributeName: string, element: Element): void {
  if (attributeName.startsWith('bind-') && !isBindingAttribute(attributeName)) {
    const elementSnippet = extractElementSnippet(element)
    throw new InvalidBindingAttributeError(attributeName, elementSnippet)
  }
}
