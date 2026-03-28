import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty } from './nestedProperties'
import type { ContentBinding, ViewModel } from './types'

function setupSingleContentBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ContentBinding | null {
  const propertyName = element.getAttribute('bind-content')
  if (!propertyName?.trim()) return null

  assertViewModelProperty(viewModel, propertyName, 'bind-content', element)

  return { element, propertyName }
}

export function setupContentBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ContentBinding[] {
  const elements = root.querySelectorAll<HTMLElement>('[bind-content]')

  return Array.from(elements)
    .map((element) => setupSingleContentBinding(element, viewModel))
    .filter((binding): binding is ContentBinding => binding !== null)
}

function renderSingleContentBinding<T extends object>(
  binding: ContentBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)

  console.log(
    '[pelela] renderContentBinding:',
    binding.element.tagName,
    'property:',
    binding.propertyName,
    'value:',
    value,
  )

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
