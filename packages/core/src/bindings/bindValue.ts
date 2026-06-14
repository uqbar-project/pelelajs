import { parse, stringify } from 'devalue'
import { extractElementSnippet, filterOwnElements, findAllElements } from '../commons/helpers'
import { getDecimalSeparator, getThousandsSeparator } from '../commons/i18n'
import { UnsupportedElementError } from '../errors'
import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty, setNestedProperty } from './nestedProperties'
import { getOptionValue, hasOptionValue } from './optionValues'
import type { ValueBinding, ViewModel } from './types'

function handleSelectWithWeakMap<T extends object>(
  target: HTMLSelectElement,
  viewModel: ViewModel<T>,
  propertyName: string,
): void {
  const selectedOption = target.options[target.selectedIndex]
  if (hasOptionValue(selectedOption)) {
    setNestedProperty(viewModel, propertyName, getOptionValue(selectedOption))
  } else {
    setNestedProperty(viewModel, propertyName, selectedOption.value)
  }
}

function handleObjectValue<T extends object>(
  inputValue: string,
  viewModel: ViewModel<T>,
  propertyName: string,
): void {
  try {
    const parsed = parse(inputValue)
    setNestedProperty(viewModel, propertyName, parsed)
  } catch {
    setNestedProperty(viewModel, propertyName, inputValue)
  }
}

function handleNumericValue<T extends object>(
  inputValue: string,
  viewModel: ViewModel<T>,
  propertyName: string,
): void {
  const separator = getDecimalSeparator()
  const thousandsSeparator = getThousandsSeparator()

  const normalizedValue = inputValue
    .replace(/\s/g, '')
    .split(thousandsSeparator)
    .join('')
    .replace(separator, '.')

  const numeric = Number(normalizedValue)
  setNestedProperty(viewModel, propertyName, Number.isNaN(numeric) ? 0 : numeric)
}

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

    if (target instanceof HTMLSelectElement) {
      handleSelectWithWeakMap(target, viewModel, propertyName)
      return
    }

    const inputValue = target.value

    if (typeof currentValue === 'object' && currentValue !== null) {
      handleObjectValue(inputValue, viewModel, propertyName)
      return
    }

    if (typeof currentValue === 'number') {
      handleNumericValue(inputValue, viewModel, propertyName)
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

function renderSelectWithWeakMap(select: HTMLSelectElement, value: unknown): boolean {
  const matchingIndex = Array.from(select.options).findIndex((opt) => {
    if (!hasOptionValue(opt)) {
      return false
    }
    const optionValue = getOptionValue(opt)
    if (optionValue === value) {
      return true
    }
    // If both are objects, compare their properties
    if (
      typeof optionValue === 'object' &&
      optionValue !== null &&
      typeof value === 'object' &&
      value !== null
    ) {
      const optionKeys = Object.keys(optionValue)
      const valueKeys = Object.keys(value)
      if (optionKeys.length !== valueKeys.length) {
        return false
      }
      return optionKeys.every(
        (key) =>
          (optionValue as Record<string, unknown>)[key] === (value as Record<string, unknown>)[key],
      )
    }
    return false
  })
  if (matchingIndex >= 0 && select.selectedIndex !== matchingIndex) {
    select.selectedIndex = matchingIndex
  }
  return matchingIndex >= 0
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
    if (input instanceof HTMLSelectElement && renderSelectWithWeakMap(input, value)) {
      return
    }

    const newValue = value ?? ''
    let stringValue = String(newValue)

    if (
      typeof newValue === 'object' &&
      newValue !== null &&
      !(input instanceof HTMLSelectElement)
    ) {
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
