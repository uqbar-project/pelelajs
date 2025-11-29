import type { BindingsCollection, ViewModel } from "./types";
import { setupValueBindings, renderValueBindings } from "./bindValue";
import { setupIfBindings, renderIfBindings } from "./bindIf";
import { setupClassBindings, renderClassBindings } from "./bindClass";
import { setupStyleBindings, renderStyleBindings } from "./bindStyle";
import { setupClickBindings } from "./bindClick";

export function setupBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): () => void {
  const bindings: BindingsCollection = {
    valueBindings: setupValueBindings(root, viewModel),
    ifBindings: setupIfBindings(root, viewModel),
    classBindings: setupClassBindings(root, viewModel),
    styleBindings: setupStyleBindings(root, viewModel),
  };

  setupClickBindings(root, viewModel);

  const render = () => {
    renderValueBindings(bindings.valueBindings, viewModel);
    renderIfBindings(bindings.ifBindings, viewModel);
    renderClassBindings(bindings.classBindings, viewModel);
    renderStyleBindings(bindings.styleBindings, viewModel);
  };

  render();
  return render;
}

