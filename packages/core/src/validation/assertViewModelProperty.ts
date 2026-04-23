import { extractElementSnippet, isObject } from '../commons/helpers'
import { type BindingKind, PropertyValidationError } from '../errors'

function hasNestedProperty(targetObject: unknown, path: string): boolean {
  if (!isObject(targetObject)) {
    return false
  }

  // Optimize for simple property access or full path matches.
  if (!path.includes('.') && path in targetObject) {
    return true
  }

  const pathSegments = path.split('.')
  let currentValue: unknown = targetObject

  return pathSegments.every((segment) => {
    if (isObject(currentValue) && segment in currentValue) {
      currentValue = currentValue[segment]
      return true
    }
    return false
  })
}

/**
 * Asserts that a property exists in the view model.
 * If the property is missing, it throws a PropertyValidationError.
 *
 * Why we do this:
 * This is a Developer Experience (DX) feature to catch binding typos or
 * missing view model properties early in the development cycle, providing
 * clear, fail-fast feedback with the exact HTML element causing the issue.
 */
export function assertViewModelProperty<T extends object>(
  viewModel: T,
  propertyName: string,
  kind: BindingKind,
  element: Element,
): void {
  if (!hasNestedProperty(viewModel, propertyName)) {
    const elementSnippet = extractElementSnippet(element)

    throw new PropertyValidationError({
      propertyName,
      bindingKind: kind,
      viewModelName: viewModel.constructor.name,
      elementSnippet,
    })
  }
}
