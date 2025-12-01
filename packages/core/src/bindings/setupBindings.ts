import type { 
  BindingsCollection, 
  ViewModel,
  ValueBinding,
  IfBinding,
  ClassBinding,
  StyleBinding,
  ForEachBinding,
} from "./types";
import { setupValueBindings, renderValueBindings } from "./bindValue";
import { setupIfBindings, renderIfBindings } from "./bindIf";
import { setupClassBindings, renderClassBindings } from "./bindClass";
import { setupStyleBindings, renderStyleBindings } from "./bindStyle";
import { setupClickBindings } from "./bindClick";
import { setupForEachBindings, renderForEachBindings } from "./bindForEach";
import { DependencyTracker } from "./dependencyTracker";

type AnyBinding = ForEachBinding | ValueBinding | IfBinding | ClassBinding | StyleBinding;

function registerAllBindingDependencies(
  bindings: BindingsCollection,
  tracker: DependencyTracker
): void {
  const bindingConfigurations: Array<{
    list: AnyBinding[];
    getPath: (binding: AnyBinding) => string;
  }> = [
    { 
      list: bindings.forEachBindings, 
      getPath: (binding) => (binding as ForEachBinding).collectionName 
    },
    { 
      list: bindings.valueBindings, 
      getPath: (binding) => (binding as ValueBinding).propertyName 
    },
    { 
      list: bindings.ifBindings, 
      getPath: (binding) => (binding as IfBinding).propertyName 
    },
    { 
      list: bindings.classBindings, 
      getPath: (binding) => (binding as ClassBinding).propertyName 
    },
    { 
      list: bindings.styleBindings, 
      getPath: (binding) => (binding as StyleBinding).propertyName 
    },
  ];

  for (const config of bindingConfigurations) {
    for (const binding of config.list) {
      tracker.registerDependency(binding, config.getPath(binding));
    }
  }
}

function executeRenderPipeline<T extends object>(
  targetBindings: BindingsCollection,
  viewModel: ViewModel<T>
): void {
  if (targetBindings.forEachBindings.length > 0) {
    renderForEachBindings(targetBindings.forEachBindings, viewModel);
  }
  if (targetBindings.valueBindings.length > 0) {
    renderValueBindings(targetBindings.valueBindings, viewModel);
  }
  if (targetBindings.ifBindings.length > 0) {
    renderIfBindings(targetBindings.ifBindings, viewModel);
  }
  if (targetBindings.classBindings.length > 0) {
    renderClassBindings(targetBindings.classBindings, viewModel);
  }
  if (targetBindings.styleBindings.length > 0) {
    renderStyleBindings(targetBindings.styleBindings, viewModel);
  }
}

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
  registerAllBindingDependencies(bindings, tracker);

  const render = (changedPath?: string) => {
    const targetBindings = changedPath 
      ? tracker.getDependentBindings(changedPath, bindings)
      : bindings;

    executeRenderPipeline(targetBindings, viewModel);
  };

  render();
  return render;
}

