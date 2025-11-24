import type { VisibleBinding } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";

export function setupVisibleBindings(
  root: HTMLElement,
  viewModel: any,
): VisibleBinding[] {
  const bindings: VisibleBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[bind-visible]");

  for (const element of elements) {
    const propertyName = element.getAttribute("bind-visible");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "bind-visible", element);

    bindings.push({
      element,
      propertyName,
      originalDisplay: element.style.display || "",
    });
  }

  return bindings;
}

export function renderVisibleBindings(
  bindings: VisibleBinding[],
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

