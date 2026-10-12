import { filterOwnElements, findAllElements } from '../commons/helpers'
import { t } from '../commons/i18n'
import { resolveBindingValue } from './forEachMethodBinding'
import { setupSingleBinding } from './setupSingleBinding'
import type { SrcBinding, ViewModel } from './types'

function setupSingleSrcBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): SrcBinding | null {
  if (!(element instanceof HTMLImageElement)) {
    throw new Error(t('errors.bindings.srcOnlyForImg', { tag: element.tagName.toLowerCase() }))
  }

  return setupSingleBinding(element, viewModel, 'bind-src', (base) => ({
    ...base,
    element,
  }))
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
  const value = resolveBindingValue(viewModel, binding)
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
