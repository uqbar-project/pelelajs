import { getNestedProperty } from '../bindings/nestedProperties'
import {
  extractElementSnippet,
  findCaseInsensitiveMember,
  isArrowFunctionMember,
  isObject,
  isValidIdentifier,
} from '../commons/helpers'
import {
  ArrowFunctionAsPropertyError,
  type BindingKind,
  MethodAsPropertyError,
  PropertyCaseMismatchError,
  PropertyValidationError,
} from '../errors'

function hasNestedProperty(targetObject: unknown, path: string): boolean {
  if (!isObject(targetObject)) {
    return false
  }

  const pathSegments = path.split('.')
  let currentValue: unknown = targetObject

  return pathSegments.every((segment, index) => {
    if (isObject(currentValue) && segment in currentValue) {
      currentValue = currentValue[segment]
      return true
    }

    if (index > 0 && (currentValue === null || currentValue === undefined)) {
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
  if (hasNestedProperty(viewModel, propertyName)) {
    const resolvedValue = getNestedProperty(viewModel, propertyName)
    if (typeof resolvedValue === 'function') {
      const memberName = propertyName.split('.')[0]
      const memberValue = (viewModel as Record<string, unknown>)[memberName]
      if (isArrowFunctionMember(viewModel, memberName, memberValue)) {
        throw new ArrowFunctionAsPropertyError({
          propertyName,
          bindingKind: kind,
          viewModelName: viewModel.constructor.name,
          elementSnippet: extractElementSnippet(element),
        })
      }
      throw new MethodAsPropertyError({
        propertyName,
        bindingKind: kind,
        viewModelName: viewModel.constructor.name,
        elementSnippet: extractElementSnippet(element),
      })
    }
    return
  }

  const elementSnippet = extractElementSnippet(element)
  if (isValidIdentifier(propertyName)) {
    const suggestedName = findCaseInsensitiveMember(viewModel, propertyName)
    if (suggestedName) {
      throw new PropertyCaseMismatchError({
        propertyName,
        bindingKind: kind,
        viewModelName: viewModel.constructor.name,
        elementSnippet,
        suggestedName,
      })
    }
  }

  throw new PropertyValidationError({
    propertyName,
    bindingKind: kind,
    viewModelName: viewModel.constructor.name,
    elementSnippet,
  })
}
