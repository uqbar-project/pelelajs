import { extractElementSnippet, filterOwnElements, findAllElements } from '../commons/helpers'
import { t } from '../commons/i18n'
import { InvalidPropertyTypeError } from '../errors/InvalidPropertyTypeError'
import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty } from './nestedProperties'
import type { EnabledBinding, ViewModel } from './types'

export const VALID_TAGS = [
  'INPUT',
  'SELECT',
  'BUTTON',
  'TEXTAREA',
  'OPTGROUP',
  'OPTION',
  'FIELDSET',
]

function setupSingleEnabledBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): EnabledBinding | null {
  const propertyName = element.getAttribute('bind-enabled')
  if (!propertyName?.trim()) return null

  if (!VALID_TAGS.includes(element.tagName)) {
    throw new Error(
      t('errors.bindings.enabledOnlyForFormControls', { tag: element.tagName.toLowerCase() }),
    )
  }

  assertViewModelProperty(viewModel, propertyName, 'bind-enabled', element)

  return { element: element as EnabledBinding['element'], propertyName }
}

export function setupEnabledBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): EnabledBinding[] {
  const elements = findAllElements(root, '[bind-enabled]')
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleEnabledBinding(element, viewModel))
    .filter((binding): binding is EnabledBinding => binding !== null)
}

function renderSingleEnabledBinding<T extends object>(
  binding: EnabledBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)

  if (value === null || value === undefined) {
    binding.element.disabled = true
    return
  }

  if (typeof value !== 'boolean') {
    throw new InvalidPropertyTypeError({
      propertyName: binding.propertyName,
      bindingKind: 'bind-enabled',
      expectedType: 'a boolean',
      viewModelName: viewModel.constructor?.name ?? 'Unknown',
      elementSnippet: extractElementSnippet(binding.element),
    })
  }

  const shouldBeDisabled = !value
  if (binding.element.disabled !== shouldBeDisabled) {
    binding.element.disabled = shouldBeDisabled
  }
}

export function renderEnabledBindings<T extends object>(
  bindings: EnabledBinding[],
  viewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    renderSingleEnabledBinding(binding, viewModel)
  })
}
