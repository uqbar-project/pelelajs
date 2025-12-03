import type { ClassBinding, ViewModel } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";
import { getNestedProperty } from "./nestedProperties";

function setupSingleClassBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ClassBinding | null {
  const propertyName = element.getAttribute("bind-class");
  if (!propertyName || !propertyName.trim()) return null;

  assertViewModelProperty(viewModel, propertyName, "bind-class", element);

  return {
    element,
    propertyName,
    staticClassName: element.className,
  };
}

export function setupClassBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ClassBinding[] {
  const bindings: ClassBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[bind-class]");

  for (const element of elements) {
    const binding = setupSingleClassBinding(element, viewModel);
    if (binding) {
      bindings.push(binding);
    }
  }

  return bindings;
}

function renderSingleClassBinding<T extends object>(
  binding: ClassBinding,
  viewModel: ViewModel<T>,
): void {
  const value = getNestedProperty(viewModel, binding.propertyName);

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

export function renderClassBindings<T extends object>(
  bindings: ClassBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleClassBinding(binding, viewModel);
  }
}

