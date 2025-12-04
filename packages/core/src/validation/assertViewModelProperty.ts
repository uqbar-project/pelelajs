import { BindingKind, PropertyValidationError } from "../errors";

function hasNestedProperty(obj: any, path: string): boolean {
  if (path in obj) {
    return true;
  }

  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return false;
    }
    
    if (!(part in current)) {
      return false;
    }
    
    current = current[part];
  }

  return true;
}

export function assertViewModelProperty<T extends object>(
  viewModel: T,
  propertyName: string,
  kind: BindingKind,
  element: Element,
): void {
  if (!hasNestedProperty(viewModel, propertyName)) {
    const snippet = element.outerHTML.replace(/\s+/g, " ").trim().slice(0, 100);

    throw new PropertyValidationError(
      propertyName,
      kind,
      viewModel.constructor.name,
      snippet,
    );
  }
}

