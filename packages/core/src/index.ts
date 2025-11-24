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

type ClassBinding = {
  element: HTMLElement;
  propertyName: string;
  staticClassName: string;
};

type StyleBinding = {
  element: HTMLElement;
  propertyName: string;
};

function assertViewModelProperty(
  viewModel: any,
  propertyName: string,
  kind: string,
  element: Element,
): void {
  if (!(propertyName in viewModel)) {
    const snippet = element.outerHTML.replace(/\s+/g, " ").trim().slice(0, 100);

    throw new Error(
      `[pelela] Unknown property "${propertyName}" used in ${kind} on: ${snippet}. ` +
      `Make sure your view model "${viewModel.constructor.name}" defines it.`,
    );
  }
}

function setupBindings(root: HTMLElement, viewModel: any): () => void {
  const valueBindings: ValueBinding[] = [];
  const visibleBindings: VisibleBinding[] = [];
  const classBindings: ClassBinding[] = [];
  const styleBindings: StyleBinding[] = [];

  // --- bind-value ---
  const valueElements = root.querySelectorAll<HTMLElement>("[bind-value]");

  for (const element of valueElements) {
    const propertyName = element.getAttribute("bind-value");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "bind-value", element);

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

    assertViewModelProperty(viewModel, propertyName, "bind-visible", element);

    visibleBindings.push({
      element,
      propertyName,
      originalDisplay: element.style.display || "",
    });
  }

  // --- bind-class ---
  const classElements = root.querySelectorAll<HTMLElement>("[bind-class]");

  for (const element of classElements) {
    const propertyName = element.getAttribute("bind-class");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "bind-class", element);

    classBindings.push({
      element,
      propertyName,
      staticClassName: element.className,
    });
  }

  // --- bind-style ---
  const styleElements = root.querySelectorAll<HTMLElement>("[bind-style]");

  for (const element of styleElements) {
    const propertyName = element.getAttribute("bind-style");
    if (!propertyName) continue;

    assertViewModelProperty(viewModel, propertyName, "bind-style", element);

    styleBindings.push({
      element,
      propertyName,
    });
  }

  // --- click="metodo" ---
  const clickElements = root.querySelectorAll<HTMLElement>("[click]");

  for (const element of clickElements) {
    const handlerName = element.getAttribute("click");
    if (!handlerName) continue;

    element.addEventListener("click", (event) => {
      const handler = (viewModel as any)[handlerName];

      if (typeof handler !== "function") {
        throw new Error(
          `[pelela] Handler "${handlerName}" definido en click="..." no es una función ` +
          `del view model "${viewModel.constructor?.name ?? "Unknown"}".`,
        );
      }

      handler.call(viewModel, event);
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

    // class bindings
    for (const binding of classBindings) {
      const value = (viewModel as any)[binding.propertyName];

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

    // style bindings
    for (const binding of styleBindings) {
      const value = (viewModel as any)[binding.propertyName];

      if (!value || typeof value !== "object") {
        binding.element.removeAttribute("style");
        continue;
      }

      const styleObj = value as Record<string, string | number>;
      const elStyle = binding.element.style;

      elStyle.cssText = "";

      for (const [key, v] of Object.entries(styleObj)) {
        if (v === undefined || v === null) continue;
        const cssValue = String(v);
        // key tipo camelCase: backgroundColor, fontWeight, etc.
        (elStyle as any)[key as any] = cssValue;
      }
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
  root?: ParentNode;
};

export function bootstrap(options: PelelaOptions = {}): void {
  // const doc = options.document ?? window.document;

  // const roots = Array.from(
  //   doc.querySelectorAll<HTMLElement>("pelela[view-model]"),
  // );

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

export function mountTemplate(
  container: HTMLElement,
  templateHtml: string,
): void {
  container.innerHTML = templateHtml;
  bootstrap({ root: container });
}