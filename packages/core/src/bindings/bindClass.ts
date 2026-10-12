import { filterOwnElements, findAllElements } from '../commons/helpers'
import { resolveBindingValue } from './forEachMethodBinding'
import { setupSingleBinding } from './setupSingleBinding'
import type { ClassBinding, ViewModel } from './types'

function setupSingleClassBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ClassBinding | null {
  return setupSingleBinding(element, viewModel, 'bind-class', (base) => ({
    ...base,
    staticClassName: element.className,
  }))
}

export function setupClassBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ClassBinding[] {
  const elements = findAllElements(root, '[bind-class]')
  const ownElements = filterOwnElements(elements, root)

  return ownElements
    .map((element) => setupSingleClassBinding(element, viewModel))
    .filter((binding): binding is ClassBinding => binding !== null)
}

function renderSingleClassBinding<T extends object>(
  binding: ClassBinding,
  viewModel: ViewModel<T>,
): void {
  const value = resolveBindingValue(viewModel, binding)

  const dynamicClasses = buildDynamicClasses(value)
  const finalClasses = [binding.staticClassName.trim(), dynamicClasses].filter(Boolean).join(' ')

  binding.element.className = finalClasses
}

function buildDynamicClasses(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string' && item.trim() !== '')
      .map((className) => className.trim())
      .join(' ')
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name)
      .join(' ')
  }

  return ''
}

export function renderClassBindings<T extends object>(
  bindings: ClassBinding[],
  viewModel: ViewModel<T>,
): void {
  bindings.forEach((binding) => {
    renderSingleClassBinding(binding, viewModel)
  })
}
