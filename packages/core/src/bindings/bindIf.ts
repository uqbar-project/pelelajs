import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty } from './nestedProperties'
import type { IfBinding, ViewModel } from './types'
import { isInsideComponent, querySelectorAllInclusive } from './componentHelpers'

function setupSingleIfBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): IfBinding | null {
  const propertyName = element.getAttribute('if')
  if (!propertyName || !propertyName.trim()) return null

  assertViewModelProperty(viewModel, propertyName, 'if', element)

  return {
    element,
    propertyName,
    originalDisplay: element.style.display || '',
  }
}

export function setupIfBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): IfBinding[] {
  const bindings: IfBinding[] = []
  const elements = querySelectorAllInclusive(root, '[if]')

  for (const element of elements) {
    if (isInsideComponent(element, root)) {
      continue
    }
    const binding = setupSingleIfBinding(element, viewModel)
    if (binding) {
      bindings.push(binding)
    }
  }

  return bindings
}

function renderSingleIfBinding<T extends object>(
  binding: IfBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)
  const shouldShow = Boolean(value)

  binding.element.style.display = shouldShow ? binding.originalDisplay : 'none'
}

export function renderIfBindings<T extends object>(
  bindings: IfBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleIfBinding(binding, viewModel)
  }
}
