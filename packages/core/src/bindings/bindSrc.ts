import { filterOwnElements, findAllElements } from '../commons/helpers'
import { t } from '../commons/i18n'
import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty } from './nestedProperties'
import type { SrcBinding, ViewModel } from './types'

function setupSingleSrcBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): SrcBinding | null {
  const propertyName = element.getAttribute('bind-src')
  if (!propertyName?.trim()) return null

  if (!(element instanceof HTMLImageElement)) {
    throw new Error(t('errors.bindings.srcOnlyForImg', { tag: element.tagName.toLowerCase() }))
  }

  assertViewModelProperty(viewModel, propertyName, 'bind-src', element)

  return { element, propertyName }
}

export function setupSrcBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): SrcBinding[] {
  const elements = findAllElements(root, '[bind-src]')
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleSrcBinding(element, viewModel))
    .filter((binding): binding is SrcBinding => binding !== null)
}

function renderSingleSrcBinding<T extends object>(
  binding: SrcBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)
  const srcValue = value === undefined || value === null ? '' : String(value)

  if (binding.element.getAttribute('src') !== srcValue) {
    if (srcValue === '') {
      binding.element.removeAttribute('src')
    } else {
      binding.element.setAttribute('src', srcValue)
    }
  }
}

export function renderSrcBindings<T extends object>(
  bindings: SrcBinding[],
  viewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    renderSingleSrcBinding(binding, viewModel)
  })
}
