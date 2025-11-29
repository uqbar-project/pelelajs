import type { IfBinding, ViewModel } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";

export function setupIfBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): IfBinding[] {
  const bindings: IfBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[if]");

  for (const element of elements) {
    const propertyName = element.getAttribute("if");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "if", element);

    bindings.push({
      element,
      propertyName,
      originalDisplay: element.style.display || "",
    });
  }

  return bindings;
}

export function renderIfBindings<T extends object>(
  bindings: IfBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    const value = viewModel[binding.propertyName];
    const shouldShow = Boolean(value);

    binding.element.style.display = shouldShow
      ? binding.originalDisplay
      : "none";
  }
}


