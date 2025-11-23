type ViewModelConstructor<T = unknown> = {
  new (): T;
};

const viewModelRegistry = new Map<string, ViewModelConstructor>();

function createReactiveViewModel<T extends object>(
  target: T,
  onChange: () => void,
): T {
  const handler: ProxyHandler<T> = {
    set(obj, prop, value) {
      const result = Reflect.set(obj, prop, value);
      onChange();
      return result;
    },
  };

  return new Proxy(target, handler);
}

type ValueBinding = {
  element: HTMLElement;
  propertyName: string;
  isInput: boolean;
};

type VisibleBinding = {
  element: HTMLElement;
  propertyName: string;
  originalDisplay: string;
};

function setupBindings(root: HTMLElement, viewModel: any): () => void {
  const valueBindings: ValueBinding[] = [];
  const visibleBindings: VisibleBinding[] = [];

  // --- bind-value ---
  const valueElements = root.querySelectorAll<HTMLElement>("[bind-value]");

  for (const element of valueElements) {
    const propertyName = element.getAttribute("bind-value");
    if (!propertyName) continue;

    const isInput =
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement;

    valueBindings.push({ element, propertyName, isInput });

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

  // --- bind-visible ---
  const visibleElements = root.querySelectorAll<HTMLElement>("[bind-visible]");

  for (const element of visibleElements) {
    const propertyName = element.getAttribute("bind-visible");
    if (!propertyName) continue;

    visibleBindings.push({
      element,
      propertyName,
      originalDisplay: element.style.display || "",
    });
  }

  const render = () => {
    // value bindings
    for (const binding of valueBindings) {
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

    // visible bindings
    for (const binding of visibleBindings) {
      const value = (viewModel as any)[binding.propertyName];
      const shouldShow = Boolean(value);

      binding.element.style.display = shouldShow
        ? binding.originalDisplay
        : "none";
    }
  };

  render();
  return render;
}

export function defineViewModel(
  name: string,
  ctor: ViewModelConstructor,
): void {
  if (viewModelRegistry.has(name)) {
    throw new Error(`[pelela] View model "${name}" is already registered`);
  }
  viewModelRegistry.set(name, ctor);
}

export type PelelaOptions = {
  document?: Document;
};

export function bootstrap(options: PelelaOptions = {}): void {
  const doc = options.document ?? window.document;

  const roots = Array.from(
    doc.querySelectorAll<HTMLElement>("pelela[view-model]"),
  );

  if (roots.length === 0) {
    console.warn("[pelela] No <pelela view-model=\"...\"> elements found");
  }

  for (const root of roots) {
    const name = root.getAttribute("view-model");
    if (!name) continue;

    const ctor = viewModelRegistry.get(name);
    if (!ctor) {
      throw new Error(
        `[pelela] View model "${name}" is not registered. Did you call defineViewModel?`,
      );
    }

    const instance = new ctor();

    let render: () => void = () => {};

    const reactiveInstance = createReactiveViewModel(instance as object, () => {
      render();
    });

    (root as any).__pelelaViewModel = reactiveInstance;

    render = setupBindings(root, reactiveInstance);

    console.log(
      `[pelela] View model "${name}" instantiated and bound`,
      reactiveInstance,
    );
  }
}