import { extractElementSnippet } from '../commons/helpers'
import { PelelaError } from './PelelaError'

export class UnknownComponentError extends PelelaError {
  constructor(tagName: string, element: HTMLElement) {
    super(
      `Unknown component: <${tagName}>. Did you forget to register it?\nFound at: ${extractElementSnippet(
        element,
      )}`,
    )
    this.name = 'UnknownComponentError'
  }
}
