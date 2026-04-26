import { filterOwnElements } from '../commons/helpers'
import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import { getNestedProperty } from './nestedProperties'
import type { StyleBinding, ViewModel } from './types'

function setupSingleStyleBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): StyleBinding | null {
  const propertyName = element.getAttribute('bind-style')
  if (!propertyName?.trim()) return null

  assertViewModelProperty(viewModel, propertyName, 'bind-style', element)

  return {
    element,
    propertyName,
  }
}

export function setupStyleBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): StyleBinding[] {
  const elements = root.querySelectorAll<HTMLElement>('[bind-style]')
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleStyleBinding(element, viewModel))
    .filter((binding): binding is StyleBinding => binding !== null)
}

function renderSingleStyleBinding<T extends object>(
  binding: StyleBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName)

  if (!value || typeof value !== 'object') {
    binding.element.removeAttribute('style')
    return
  }

  const styleObj = value as Record<string, string | number>
  const elStyle = binding.element.style

  elStyle.cssText = ''

  Object.entries(styleObj)
    .filter(([, styleValue]) => styleValue !== undefined && styleValue !== null)
    .forEach(([key, styleValue]) => {
      const cssValue = String(styleValue)
      ;(elStyle as unknown as Record<string, string>)[key] = cssValue
    })
}

export function renderStyleBindings<T extends object>(
  bindings: StyleBinding[],
  viewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    renderSingleStyleBinding(binding, viewModel)
  })
}
