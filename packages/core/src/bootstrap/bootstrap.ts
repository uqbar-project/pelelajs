import type { PelelaOptions } from "../types";
import { getViewModel } from "../registry/viewModelRegistry";
import { createReactiveViewModel } from "../reactivity/reactiveProxy";
import { setupBindings } from "../bindings/setupBindings";
import { ViewModelRegistrationError } from "../errors/index";
import { ViewModel } from "../bindings/types";

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
      throw new ViewModelRegistrationError(name, "missing");
    }

    const instance = new ctor();

    let render: (changedPath?: string) => void = () => {};

    const reactiveInstance = createReactiveViewModel(
      instance as Record<string, unknown>,
      (changedPath: string) => {
        render(changedPath);
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

