import type { StyleBinding } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";

export function setupStyleBindings(
  root: HTMLElement,
  viewModel: any,
): StyleBinding[] {
  const bindings: StyleBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[bind-style]");

  for (const element of elements) {
    const propertyName = element.getAttribute("bind-style");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "bind-style", element);

    bindings.push({
      element,
      propertyName,
    });
  }

  return bindings;
}

export function renderStyleBindings(
  bindings: StyleBinding[],
  viewModel: any,
): void {
  for (const binding of bindings) {
    const value = (viewModel as any)[binding.propertyName];

    if (!value || typeof value !== "object") {
      binding.element.removeAttribute("style");
      continue;
    }

    const styleObj = value as Record<string, string | number>;
    const elStyle = binding.element.style;

    elStyle.cssText = "";

    for (const [key, v] of Object.entries(styleObj)) {
      if (v === undefined || v === null) continue;
      const cssValue = String(v);
      (elStyle as any)[key as any] = cssValue;
    }
  }
}

