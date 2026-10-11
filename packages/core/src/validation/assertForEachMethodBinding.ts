import { readViewModelName } from '../bindings/forEachMethodBinding'
import {
  getForEachScopeInfo,
  isForEachScopeVariable,
  resolveScopeRootViewModel,
} from '../bindings/forEachScope'
import type { ViewModel } from '../bindings/types'
import { extractElementSnippet, isValidIdentifier } from '../commons/helpers'
import { isUnsafeKey } from '../commons/sanitization'
import { type BindingKind, ForEachMethodArityError, MethodAsPropertyError } from '../errors'
import { isViewModelMethod } from './assertViewModelProperty'

function readArity(candidate: unknown): number {
  if (typeof candidate !== 'function') return 0
  const length = (candidate as { length: unknown }).length
  return typeof length === 'number' ? length : 0
}

/**
 * Tells whether a binding value names a view model method to invoke per
 * iteration instead of a bindable property. Only true inside a for-each scope,
 * for bare identifiers that resolve to a prototype method on the owning view
 * model. Scope variables, nested paths and unsafe keys always resolve as data.
 */
export function isForEachMethodBinding(viewModel: object, propertyName: string): boolean {
  const scopeInfo = getForEachScopeInfo(viewModel)
  if (scopeInfo === null) return false
  if (!isValidIdentifier(propertyName) || isUnsafeKey(propertyName)) return false
  if (isForEachScopeVariable(viewModel, propertyName)) return false
  const rootViewModel = resolveScopeRootViewModel(viewModel)
  const candidate = (rootViewModel as ViewModel)[propertyName]
  if (typeof candidate !== 'function') return false
  return isViewModelMethod(rootViewModel, propertyName)
}

/**
 * Fails fast when a for-each method does not follow the single scope object
 * convention. Two-way bindings (bind-value, link-*) and properties outside a
 * for-each never reach this check: they keep their historical validation.
 */
export function assertForEachMethodBinding<T extends object>(
  viewModel: T,
  methodName: string,
  kind: BindingKind,
  element: Element,
): void {
  const rootViewModel = resolveScopeRootViewModel(viewModel)
  const actualParams = readArity((rootViewModel as ViewModel)[methodName])
  if (actualParams !== 1) {
    throw new ForEachMethodArityError({
      methodName,
      bindingKind: kind,
      viewModelName: readViewModelName(rootViewModel),
      elementSnippet: extractElementSnippet(element),
      actualParams,
    })
  }
}

/**
 * Rejects a method used where the binding writes back (link-*). Reading a
 * method result per iteration is valid for one-way bindings, but propagating a
 * child change into a method call would overwrite the method itself.
 */
export function assertNoForEachMethodInTwoWayBinding<T extends object>(
  viewModel: T,
  propertyName: string,
  kind: BindingKind,
  element: Element,
): void {
  if (!isForEachMethodBinding(viewModel, propertyName)) return
  const rootViewModel = resolveScopeRootViewModel(viewModel)
  throw new MethodAsPropertyError({
    propertyName,
    bindingKind: kind,
    viewModelName: readViewModelName(rootViewModel),
    elementSnippet: extractElementSnippet(element),
  })
}
