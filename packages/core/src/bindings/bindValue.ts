import type { ValueBinding, ViewModel } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";

export function setupValueBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ValueBinding[] {
  const bindings: ValueBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[bind-value]");

  for (const element of elements) {
    const propertyName = element.getAttribute("bind-value");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "bind-value", element);

    const isInput =
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement;

    bindings.push({ element, propertyName, isInput });

    if (isInput) {
      element.addEventListener("input", (event) => {
        const target = event.target as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement;
        const currentValue = viewModel[propertyName];

        if (typeof currentValue === "number") {
          const numeric = Number(target.value.replace(",", "."));
          Reflect.set(
            viewModel,
            propertyName,
            Number.isNaN(numeric) ? 0 : numeric,
          );
        } else {
          Reflect.set(viewModel, propertyName, target.value);
        }
      });
    }
  }

  return bindings;
}

export function renderValueBindings<T extends object>(
  bindings: ValueBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    const value = viewModel[binding.propertyName];

    console.log(
      "[pelela] renderValueBinding:",
      binding.element.tagName,
      "property:",
      binding.propertyName,
      "value:",
      value,
      "isInput:",
      binding.isInput,
    );

    if (binding.isInput) {
      const input = binding.element as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement;
      const newValue = value ?? "";
      if (input.value !== String(newValue)) {
        input.value = String(newValue);
      }
    } else {
      binding.element.textContent =
        value === undefined || value === null ? "" : String(value);
      console.log(
        "[pelela] set textContent:",
        binding.element.tagName,
        "to:",
        binding.element.textContent,
      );
    }
  }
}

