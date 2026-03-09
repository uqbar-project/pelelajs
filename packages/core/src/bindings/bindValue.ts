import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty, setNestedProperty } from './nestedProperties'
import type { ValueBinding, ViewModel } from './types'

function setupSingleValueBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding | null {
  const propertyName = element.getAttribute('bind-value')
  if (!propertyName || !propertyName.trim()) return null

  assertViewModelProperty(viewModel, propertyName, 'bind-value', element)

  const isInput =
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement

  if (!isInput) {
    const snippet = element.outerHTML.replace(/\s+/g, ' ').trim().slice(0, 100)
    throw new Error(
      `bind-value can only be used on input, textarea, or select elements. Found on <${element.tagName.toLowerCase()}>. Use bind-content for display elements.\nElement: ${snippet}`,
    )
  }

  element.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    const currentValue = getNestedProperty(viewModel, propertyName)

    if (typeof currentValue === 'number') {
      const numeric = Number(target.value.replace(',', '.'))
      setNestedProperty(viewModel, propertyName, Number.isNaN(numeric) ? 0 : numeric)
    } else {
      setNestedProperty(viewModel, propertyName, target.value)
    }
  })

  return { element, propertyName }
}

export function setupValueBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding[] {
  const bindings: ValueBinding[] = []
  const elements = root.querySelectorAll<HTMLElement>('[bind-value]')

  for (const element of elements) {
    const binding = setupSingleValueBinding(element, viewModel)
    if (binding) {
      bindings.push(binding)
    }
  }

  return bindings
}

function renderSingleValueBinding<T extends object>(
  binding: ValueBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)

  console.log(
    '[pelela] renderValueBinding:',
    binding.element.tagName,
    'property:',
    binding.propertyName,
    'value:',
    value,
  )

  const input = binding.element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  const newValue = value ?? ''
  if (input.value !== String(newValue)) {
    input.value = String(newValue)
  }
}

export function renderValueBindings<T extends object>(
  bindings: ValueBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleValueBinding(binding, viewModel)
  }
}
