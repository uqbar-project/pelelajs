import { parse, stringify } from 'devalue'
import { extractElementSnippet, filterOwnElements, findAllElements } from '../commons/helpers'
import { getDecimalSeparator, getThousandsSeparator } from '../commons/i18n'
import { UnsupportedElementError } from '../errors'
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

  const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)

  if (!isInput) {
    throw new UnsupportedElementError(element.tagName.toLowerCase(), extractElementSnippet(element))
  }

  const isCheckbox = element instanceof HTMLInputElement && element.type === 'checkbox'

  element.addEventListener(isCheckbox ? 'change' : 'input', (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    const currentValue = getNestedProperty(viewModel, propertyName)

    if (isCheckbox) {
      setNestedProperty(viewModel, propertyName, (target as HTMLInputElement).checked)
      return
    }

    const inputValue = target.value

    if (typeof currentValue === 'object' && currentValue !== null) {
      try {
        const parsed = parse(inputValue)
        setNestedProperty(viewModel, propertyName, parsed)
        return
      } catch {
        setNestedProperty(viewModel, propertyName, inputValue)
        return
      }
    }

    if (typeof currentValue === 'number') {
      const separator = getDecimalSeparator()
      const thousandsSeparator = getThousandsSeparator()

      const normalizedValue = inputValue
        .replace(/\s/g, '')
        .split(thousandsSeparator)
        .join('')
        .replace(separator, '.')

      const numeric = Number(normalizedValue)
      setNestedProperty(viewModel, propertyName, Number.isNaN(numeric) ? 0 : numeric)
    } else {
      setNestedProperty(viewModel, propertyName, inputValue)
    }
  })

  return { element, propertyName }
}

export function setupValueBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding[] {
  const elements = findAllElements(root, '[bind-value]')
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleValueBinding(element, viewModel))
    .filter((binding): binding is ValueBinding => binding !== null)
}

function renderSingleValueBinding<T extends object>(
  binding: ValueBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)

  const input = binding.element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  const isCheckbox = input instanceof HTMLInputElement && input.type === 'checkbox'

  if (isCheckbox) {
    ;(input as HTMLInputElement).checked = !!value
  } else {
    const newValue = value ?? ''
    let stringValue = String(newValue)

    if (typeof newValue === 'object' && newValue !== null) {
      stringValue = stringify(newValue)
    }

    if (input.value !== stringValue) {
      input.value = stringValue
    }
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
