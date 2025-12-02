import type { ViewModelConstructor } from "../types";
import { ViewModelRegistrationError } from "../errors/index";

const viewModelRegistry = new Map<string, ViewModelConstructor>();

export function registerViewModel(
  name: string,
  ctor: ViewModelConstructor,
): void {
  if (viewModelRegistry.has(name)) {
    throw new ViewModelRegistrationError(name, "duplicate");
  }
  viewModelRegistry.set(name, ctor);
}

export function getViewModel(name: string): ViewModelConstructor | undefined {
  return viewModelRegistry.get(name);
}

export function hasViewModel(name: string): boolean {
  return viewModelRegistry.has(name);
}

export function clearRegistry(): void {
  viewModelRegistry.clear();
}
