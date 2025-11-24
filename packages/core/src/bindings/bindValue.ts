import type { ValueBinding } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";

export function setupValueBindings(
  root: HTMLElement,
  viewModel: any,
): ValueBinding[] {
  const bindings: ValueBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[bind-value]");

  for (const element of elements) {
    const propertyName = element.getAttribute("bind-value");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "bind-value", element);

    const isInput =
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement;

    bindings.push({ element, propertyName, isInput });

    if (isInput) {
      element.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement;
        const currentValue = (viewModel as any)[propertyName];

        if (typeof currentValue === "number") {
          const numeric = Number(target.value.replace(",", "."));
          (viewModel as any)[propertyName] = Number.isNaN(numeric)
            ? 0
            : numeric;
        } else {
          (viewModel as any)[propertyName] = target.value;
        }
      });
    }
  }

  return bindings;
}

export function renderValueBindings(
  bindings: ValueBinding[],
  viewModel: any,
): void {
  for (const binding of bindings) {
    const value = (viewModel as any)[binding.propertyName];

    if (binding.isInput) {
      const input = binding.element as HTMLInputElement | HTMLTextAreaElement;
      const newValue = value ?? "";
      if (input.value !== String(newValue)) {
        input.value = String(newValue);
      }
    } else {
      binding.element.textContent =
        value === undefined || value === null ? "" : String(value);
    }
  }
}

