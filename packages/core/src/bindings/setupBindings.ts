import type { BindingsCollection, ViewModel } from "./types";
import { setupValueBindings, renderValueBindings } from "./bindValue";
import { setupIfBindings, renderIfBindings } from "./bindIf";
import { setupClassBindings, renderClassBindings } from "./bindClass";
import { setupStyleBindings, renderStyleBindings } from "./bindStyle";
import { setupClickBindings } from "./bindClick";
import { setupForEachBindings, renderForEachBindings } from "./bindForEach";
import { DependencyTracker } from "./dependencyTracker";

export function setupBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): (changedPath?: string) => void {
  const bindings: BindingsCollection = {
    forEachBindings: setupForEachBindings(root, viewModel),
    valueBindings: setupValueBindings(root, viewModel),
    ifBindings: setupIfBindings(root, viewModel),
    classBindings: setupClassBindings(root, viewModel),
    styleBindings: setupStyleBindings(root, viewModel),
  };

  setupClickBindings(root, viewModel);

  const tracker = new DependencyTracker();

  for (const binding of bindings.forEachBindings) {
    tracker.registerDependency(binding, binding.collectionName);
  }

  for (const binding of bindings.valueBindings) {
    tracker.registerDependency(binding, binding.propertyName);
  }

  for (const binding of bindings.ifBindings) {
    tracker.registerDependency(binding, binding.propertyName);
  }

  for (const binding of bindings.classBindings) {
    tracker.registerDependency(binding, binding.propertyName);
  }

  for (const binding of bindings.styleBindings) {
    tracker.registerDependency(binding, binding.propertyName);
  }

  const render = (changedPath?: string) => {
    if (!changedPath) {
      renderForEachBindings(bindings.forEachBindings, viewModel);
      renderValueBindings(bindings.valueBindings, viewModel);
      renderIfBindings(bindings.ifBindings, viewModel);
      renderClassBindings(bindings.classBindings, viewModel);
      renderStyleBindings(bindings.styleBindings, viewModel);
    } else {
      const affected = tracker.getDependentBindings(changedPath, bindings);
      
      if (affected.forEachBindings.length > 0) {
        renderForEachBindings(affected.forEachBindings, viewModel);
      }
      if (affected.valueBindings.length > 0) {
        renderValueBindings(affected.valueBindings, viewModel);
      }
      if (affected.ifBindings.length > 0) {
        renderIfBindings(affected.ifBindings, viewModel);
      }
      if (affected.classBindings.length > 0) {
        renderClassBindings(affected.classBindings, viewModel);
      }
      if (affected.styleBindings.length > 0) {
        renderStyleBindings(affected.styleBindings, viewModel);
      }
    }
  };

  render();
  return render;
}

