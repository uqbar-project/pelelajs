import { extractElementSnippet, filterOwnElements, findAllElements } from '../commons/helpers'
import { WrongElementForBindingError } from '../errors'
import { resolveBindingValue } from './forEachMethodBinding'
import { setupSingleBinding } from './setupSingleBinding'
import type { ContentBinding, ViewModel } from './types'

function setupSingleContentBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ContentBinding | null {
  if (element instanceof HTMLTextAreaElement) {
    throw new WrongElementForBindingError(
      'bind-content',
      element.tagName.toLowerCase(),
      extractElementSnippet(element),
      'errors.bindings.content.invalidElement',
    )
  }

  return setupSingleBinding(element, viewModel, 'bind-content', (base) => base)
}

export function setupContentBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ContentBinding[] {
  const elements = findAllElements(root, '[bind-content]')
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleContentBinding(element, viewModel))
    .filter((binding): binding is ContentBinding => binding !== null)
}

function renderSingleContentBinding<T extends object>(
  binding: ContentBinding,
  viewModel: ViewModel<T>,
): void {
  const value = resolveBindingValue(viewModel, binding)

  binding.element.textContent = value === undefined || value === null ? '' : String(value)
}

export function renderContentBindings<T extends object>(
  bindings: ContentBinding[],
  viewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    renderSingleContentBinding(binding, viewModel)
  })
}
