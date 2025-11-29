import type { ClassBinding, ViewModel } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";

export function setupClassBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ClassBinding[] {
  const bindings: ClassBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[bind-class]");

  for (const element of elements) {
    const propertyName = element.getAttribute("bind-class");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "bind-class", element);

    bindings.push({
      element,
      propertyName,
      staticClassName: element.className,
    });
  }

  return bindings;
}

export function renderClassBindings<T extends object>(
  bindings: ClassBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    const value = viewModel[binding.propertyName];

    const staticClasses = binding.staticClassName.trim();
    let dynamicClasses = "";

    if (typeof value === "string") {
      dynamicClasses = value;
    } else if (Array.isArray(value)) {
      dynamicClasses = value.filter(Boolean).join(" ");
    } else if (value && typeof value === "object") {
      dynamicClasses = Object.entries(value)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([name]) => name)
        .join(" ");
    }

    const classes = [staticClasses, dynamicClasses].filter(Boolean).join(" ");
    binding.element.className = classes;
  }
}

