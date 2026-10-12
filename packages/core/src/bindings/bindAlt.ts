import { filterOwnElements, findAllElements } from '../commons/helpers'
import { t } from '../commons/i18n'
import { resolveBindingValue } from './forEachMethodBinding'
import { setupSingleBinding } from './setupSingleBinding'
import type { AltBinding, ViewModel } from './types'

function setupSingleAltBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): AltBinding | null {
  if (!(element instanceof HTMLImageElement)) {
    throw new Error(t('errors.bindings.altOnlyForImg', { tag: element.tagName.toLowerCase() }))
  }

  return setupSingleBinding(element, viewModel, 'bind-alt', (base) => ({
    ...base,
    element,
  }))
}

export function setupAltBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): AltBinding[] {
  const elements = findAllElements(root, '[bind-alt]')
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleAltBinding(element, viewModel))
    .filter((binding): binding is AltBinding => binding !== null)
}

function renderSingleAltBinding<T extends object>(
  binding: AltBinding,
  viewModel: ViewModel<T>,
): void {
  const value = resolveBindingValue(viewModel, binding)
  const altValue = value === undefined || value === null ? '' : String(value)

  if (binding.element.getAttribute('alt') !== altValue) {
    if (altValue === '') {
      binding.element.removeAttribute('alt')
    } else {
      binding.element.setAttribute('alt', altValue)
    }
  }
}

export function renderAltBindings<T extends object>(
  bindings: AltBinding[],
  viewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    renderSingleAltBinding(binding, viewModel)
  })
}
