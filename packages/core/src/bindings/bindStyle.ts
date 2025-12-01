import type { StyleBinding, ViewModel } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";

function setupSingleStyleBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): StyleBinding | null {
  const propertyName = element.getAttribute("bind-style");
  if (!propertyName) return null;

  assertViewModelProperty(viewModel, propertyName, "bind-style", element);

  return {
    element,
    propertyName,
  };
}

export function setupStyleBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): StyleBinding[] {
  const bindings: StyleBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[bind-style]");

  for (const element of elements) {
    const binding = setupSingleStyleBinding(element, viewModel);
    if (binding) {
      bindings.push(binding);
    }
  }

  return bindings;
}

function renderSingleStyleBinding<T extends object>(
  binding: StyleBinding,
  viewModel: ViewModel<T>,
): void {
  const value = viewModel[binding.propertyName];

  if (!value || typeof value !== "object") {
    binding.element.removeAttribute("style");
    return;
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

export function renderStyleBindings<T extends object>(
  bindings: StyleBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleStyleBinding(binding, viewModel);
  }
}

