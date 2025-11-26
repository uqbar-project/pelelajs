import type { IfBinding } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";

export function setupIfBindings(
  root: HTMLElement,
  viewModel: any,
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

export function renderIfBindings(
  bindings: IfBinding[],
  viewModel: any,
): void {
  for (const binding of bindings) {
    const value = (viewModel as any)[binding.propertyName];
    const shouldShow = Boolean(value);

    binding.element.style.display = shouldShow
      ? binding.originalDisplay
      : "none";
  }
}


