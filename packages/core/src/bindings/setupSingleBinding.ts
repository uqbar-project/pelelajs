import type { BindingKind } from '../errors'
import {
  assertForEachMethodBinding,
  isForEachMethodBinding,
} from '../validation/assertForEachMethodBinding'
import { assertViewModelProperty } from '../validation/assertViewModelProperty'
import type { ViewModel } from './types'

type BaseBinding = {
  element: HTMLElement
  propertyName: string
  isMethodBinding?: boolean
}

/**
 * Why this exists:
 * Every read-only binding validates its value the same way: empty means no
 * binding, a view model method inside a for-each becomes a per-iteration call,
 * anything else must be a bindable property. Each binding only varies how it
 * completes the validated base (extra fields such as originalDisplay), which
 * it provides as a callback instead of duplicating the decision.
 */
export function setupSingleBinding<T extends object, TBinding extends BaseBinding>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
  kind: BindingKind,
  completeBinding: (base: { element: HTMLElement; propertyName: string }) => TBinding,
): TBinding | null {
  const propertyName = element.getAttribute(kind)
  if (!propertyName?.trim()) return null

  const base = { element, propertyName }
  if (isForEachMethodBinding(viewModel, propertyName)) {
    assertForEachMethodBinding(viewModel, propertyName, kind, element)
    const methodBinding = completeBinding(base)
    methodBinding.isMethodBinding = true
    return methodBinding
  }
  assertViewModelProperty(viewModel, propertyName, kind, element)
  return completeBinding(base)
}
