import type { PelelaOptions } from "../types";
import { getViewModel } from "../registry/viewModelRegistry";
import { createReactiveViewModel } from "../reactivity/reactiveProxy";
import { setupBindings } from "../bindings/setupBindings";

export function bootstrap(options: PelelaOptions = {}): void {
  const doc = options.document ?? window.document;
  const searchRoot: ParentNode = options.root ?? doc;

  const roots = Array.from(
    searchRoot.querySelectorAll<HTMLElement>("pelela[view-model]"),
  );

  if (roots.length === 0) {
    console.warn("[pelela] No <pelela view-model=\"...\"> elements found");
  }

  for (const root of roots) {
    const name = root.getAttribute("view-model");
    if (!name) continue;

    const ctor = getViewModel(name);
    if (!ctor) {
      throw new Error(
        `[pelela] View model "${name}" is not registered. Did you call defineViewModel?`,
      );
    }

    const instance = new ctor();

    let render: () => void = () => {};

    const reactiveInstance = createReactiveViewModel(
      instance as Record<string, unknown>,
      () => {
        render();
      },
    );

    (root as any).__pelelaViewModel = reactiveInstance;

    render = setupBindings(root, reactiveInstance);

    console.log(
      `[pelela] View model "${name}" instantiated and bound`,
      reactiveInstance,
    );
  }
}

