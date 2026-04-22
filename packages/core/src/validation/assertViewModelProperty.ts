import { extractElementSnippet, isObject } from '../commons/helpers'
import { type BindingKind, PropertyValidationError } from '../errors'

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
