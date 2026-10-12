import { isUnsafeKey } from '../commons/sanitization'
import { ForEachMethodScopeError } from '../errors/ForEachMethodScopeError'
import { type ForEachScopeInfo, getForEachScopeInfo } from './forEachScope'
import { getNestedProperty } from './nestedProperties'
import type { ViewModel } from './types'

type ScopeMethod = (scopeArgument: Record<string, unknown>) => unknown

export function readViewModelName(candidate: object): string {
  const constructorValue = (candidate as ViewModel).constructor
  return typeof constructorValue === 'function' ? constructorValue.name : 'Unknown'
}

function hasUnsafeScopeNames(scopeInfo: ForEachScopeInfo): boolean {
  return (
    isUnsafeKey(scopeInfo.itemName) ||
    (scopeInfo.indexName !== null && isUnsafeKey(scopeInfo.indexName))
  )
}

function findScopeMethod(scopeInfo: ForEachScopeInfo, methodName: string): ScopeMethod | null {
  if (isUnsafeKey(methodName)) return null
  const candidate = (scopeInfo.parentViewModel as ViewModel)[methodName]
  return typeof candidate === 'function' ? (candidate as ScopeMethod) : null
}

function buildScopeArgument(scopeInfo: ForEachScopeInfo): Record<string, unknown> {
  const indexEntries =
    scopeInfo.indexName === null ? {} : { [scopeInfo.indexName]: scopeInfo.indexRef.current }
  return { [scopeInfo.itemName]: scopeInfo.itemRef.current, ...indexEntries }
}

/**
 * Why this exists:
 * Bindings inside a for-each template may name a view model method instead of a
 * property. The template carries no arguments (mirroring click="handler"), so the
 * framework injects the iteration scope as a single object argument whose keys are
 * the for-each variable names.
 */
export function resolveForEachMethodValue(viewModel: ViewModel, methodName: string): unknown {
  const scopeInfo = getForEachScopeInfo(viewModel)
  if (scopeInfo === null || hasUnsafeScopeNames(scopeInfo)) {
    throw new ForEachMethodScopeError({ methodName, viewModelName: readViewModelName(viewModel) })
  }
  const method = findScopeMethod(scopeInfo, methodName)
  if (method === null) {
    throw new ForEachMethodScopeError({
      methodName,
      viewModelName: readViewModelName(scopeInfo.parentViewModel),
    })
  }
  return method.call(viewModel, buildScopeArgument(scopeInfo))
}

/**
 * Why this exists:
 * Every read-only binding resolves its value through a single polymorphic
 * entry point instead of branching on the method flag at each render site.
 */
export function resolveBindingValue(
  viewModel: ViewModel,
  binding: { propertyName: string; isMethodBinding?: boolean },
): unknown {
  return binding.isMethodBinding === true
    ? resolveForEachMethodValue(viewModel, binding.propertyName)
    : getNestedProperty(viewModel, binding.propertyName)
}
