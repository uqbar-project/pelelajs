import { PropertyValidationError, type BindingKind } from "../errors/index";

export function assertViewModelProperty<T extends object>(
  viewModel: T,
  propertyName: string,
  kind: BindingKind,
  element: Element,
): void {
  if (!(propertyName in viewModel)) {
    const snippet = element.outerHTML.replace(/\s+/g, " ").trim().slice(0, 100);

    throw new PropertyValidationError(
      propertyName,
      kind,
      viewModel.constructor.name,
      snippet,
    );
  }
}

