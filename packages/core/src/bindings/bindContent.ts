import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { isInsideComponent, querySelectorAllInclusive } from './componentHelpers'
import { getNestedProperty } from './nestedProperties'
import type { ContentBinding, ViewModel } from './types'

function setupSingleContentBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ContentBinding | null {
  const propertyName = element.getAttribute('bind-content')
  if (!propertyName || !propertyName.trim()) return null

  assertViewModelProperty(viewModel, propertyName, 'bind-content', element)

  return { element, propertyName }
}

export function setupContentBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ContentBinding[] {
  const bindings: ContentBinding[] = []
  const elements = querySelectorAllInclusive(root, '[bind-content]')

  for (const element of elements) {
    if (isInsideComponent(element, root)) {
      continue
    }

    const binding = setupSingleContentBinding(element, viewModel)
    if (binding) {
      bindings.push(binding)
    }
  }

  return bindings
}

function renderSingleContentBinding<T extends object>(
  binding: ContentBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)
  binding.element.innerHTML = value === undefined || value === null ? '' : String(value)
}

export function renderContentBindings<T extends object>(
  bindings: ContentBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleContentBinding(binding, viewModel)
  }
}
