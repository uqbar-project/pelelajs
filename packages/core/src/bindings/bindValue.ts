import { getDecimalSeparator, t } from '../commons/i18n'
import { sanitize } from '../commons/sanitization'
import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty, setNestedProperty } from './nestedProperties'
import type { ValueBinding, ViewModel } from './types'

function setupSingleValueBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding | null {
  const propertyName = element.getAttribute('bind-value')
  if (!propertyName?.trim()) return null

  assertViewModelProperty(viewModel, propertyName, 'bind-value', element)

  const isInput =
    element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'

  if (!isInput) {
    const snippet = element.outerHTML.replace(/\s+/g, ' ').trim().slice(0, 100)
    const sanitizedSnippet = sanitize(snippet) as string
    throw new Error(
      t('errors.bindings.value.invalidElement', {
        tagName: element.tagName.toLowerCase(),
        snippet: sanitizedSnippet,
      }),
    )
  }

  element.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    const currentValue = getNestedProperty(viewModel, propertyName)
    const sanitizedValue = sanitize(target.value)

    if (typeof currentValue === 'number') {
      const separator = getDecimalSeparator()
      const normalizedValue = String(sanitizedValue).replace(separator, '.')
      const numeric = Number(normalizedValue)
      setNestedProperty(viewModel, propertyName, Number.isNaN(numeric) ? 0 : numeric)
    } else {
      setNestedProperty(viewModel, propertyName, sanitizedValue)
    }
  })

  return { element, propertyName }
}

export function setupValueBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding[] {
  const elements = root.querySelectorAll<HTMLElement>('[bind-value]')

  return Array.from(elements)
    .map((element) => setupSingleValueBinding(element, viewModel))
    .filter((binding): binding is ValueBinding => binding !== null)
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
  bindings.forEach((binding) => {
    renderSingleValueBinding(binding, viewModel)
  })
}
