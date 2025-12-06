import type { ForEachBinding, ViewModel } from "./types";
import { assertViewModelProperty } from "../validation/assertViewModelProperty";
import { setupValueBindings, renderValueBindings } from "./bindValue";
import { setupIfBindings, renderIfBindings } from "./bindIf";
import { setupClassBindings, renderClassBindings } from "./bindClass";
import { setupStyleBindings, renderStyleBindings } from "./bindStyle";
import { setupClickBindings } from "./bindClick";
import { InvalidBindingSyntaxError, InvalidPropertyTypeError, InvalidDOMStructureError } from "../errors/index";

function parseForEachExpression(expression: string): {
  itemName: string;
  collectionName: string;
} | null {
  const match = expression.trim().match(/^(\w+)\s+of\s+(\w+)$/);
  if (!match) return null;
  return {
    itemName: match[1],
    collectionName: match[2],
  };
}

function createExtendedViewModel<T extends object>(
  parentViewModel: ViewModel<T>,
  itemName: string,
  itemRef: { current: any },
): ViewModel {
  return new Proxy(
    {},
    {
      has(_target, prop) {
        if (prop === itemName) return true;
        if (typeof prop === "string" && prop.startsWith(itemName + ".")) {
          return true;
        }
        return prop in parentViewModel;
      },
      get(_target, prop) {
        if (prop === itemName) {
          return itemRef.current;
        }
        if (typeof prop === "string" && prop.startsWith(itemName + ".")) {
          const itemProp = prop.substring(itemName.length + 1);
          return getNestedProperty(itemRef.current, itemProp);
        }
        return parentViewModel[prop as string];
      },
      set(_target, prop, value) {
        if (prop === itemName) {
          itemRef.current = value;
          return true;
        }
        if (typeof prop === "string" && prop.startsWith(itemName + ".")) {
          return true;
        }
        (parentViewModel as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  ) as ViewModel;
}

function getNestedProperty(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function setupBindingsForElement<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): () => void {
  const wrapper = document.createElement("div");
  const clonedForSearch = element.cloneNode(true) as HTMLElement;
  wrapper.appendChild(clonedForSearch);

  console.log(
    "[pelela] setupBindingsForElement:",
    element.tagName,
    "cloned:",
    clonedForSearch.outerHTML,
  );

  const tempBindings = {
    valueBindings: setupValueBindings(wrapper, viewModel),
    ifBindings: setupIfBindings(wrapper, viewModel),
    classBindings: setupClassBindings(wrapper, viewModel),
    styleBindings: setupStyleBindings(wrapper, viewModel),
  };

  console.log(
    "[pelela] Found bindings - value:",
    tempBindings.valueBindings.length,
    "if:",
    tempBindings.ifBindings.length,
    "class:",
    tempBindings.classBindings.length,
    "style:",
    tempBindings.styleBindings.length,
  );

  setupClickBindings(wrapper, viewModel);

  const bindings = {
    valueBindings: tempBindings.valueBindings.map((b) =>
      mapBindingToRealElement(b, clonedForSearch, element),
    ),
    ifBindings: tempBindings.ifBindings.map((b) =>
      mapBindingToRealElement(b, clonedForSearch, element),
    ),
    classBindings: tempBindings.classBindings.map((b) =>
      mapBindingToRealElement(b, clonedForSearch, element),
    ),
    styleBindings: tempBindings.styleBindings.map((b) =>
      mapBindingToRealElement(b, clonedForSearch, element),
    ),
  };

  console.log(
    "[pelela] Mapped bindings to real element:",
    element.tagName,
    "value bindings:",
    bindings.valueBindings.map((b) => ({
      el: b.element.tagName,
      prop: b.propertyName,
      same: b.element === element,
    })),
  );

  const render = () => {
    renderValueBindings(bindings.valueBindings, viewModel);
    renderIfBindings(bindings.ifBindings, viewModel);
    renderClassBindings(bindings.classBindings, viewModel);
    renderStyleBindings(bindings.styleBindings, viewModel);
  };

  return render;
}

function mapBindingToRealElement<T extends { element: HTMLElement }>(
  binding: T,
  clonedRoot: HTMLElement,
  realRoot: HTMLElement,
): T {
  return {
    ...binding,
    element: mapElementPath(binding.element, clonedRoot, realRoot),
  };
}

function mapElementPath(
  sourceElement: HTMLElement,
  sourceRoot: HTMLElement,
  targetRoot: HTMLElement,
): HTMLElement {
  if (sourceElement === sourceRoot) {
    console.log(
      "[pelela] mapElementPath: source === root, returning target",
      sourceRoot.tagName,
      "->",
      targetRoot.tagName,
    );
    return targetRoot;
  }

  const path: number[] = [];
  let current: HTMLElement | null = sourceElement;

  while (current && current !== sourceRoot) {
    const parent = current.parentElement;
    if (!parent) break;
    path.unshift(Array.from(parent.children).indexOf(current));
    current = parent as HTMLElement;
  }

  console.log(
    "[pelela] mapElementPath: following path",
    path,
    "from",
    sourceRoot.tagName,
    "to child",
    sourceElement.tagName,
  );

  let target: HTMLElement = targetRoot;
  for (const index of path) {
    const children = target.children;
    if (index >= children.length) break;
    target = children[index] as HTMLElement;
    if (!target) break;
  }

  console.log("[pelela] mapElementPath: result", target.tagName);

  return target;
}

function setupSingleForEachBinding<T extends object>(
  element: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding | null {
  const expression = element.getAttribute("for-each");
  if (!expression || !expression.trim()) return null;

  const parsed = parseForEachExpression(expression);
  if (!parsed) {
    throw new InvalidBindingSyntaxError(
      "for-each",
      expression,
      "item of collection"
    );
  }

  const { itemName, collectionName } = parsed;

  assertViewModelProperty(viewModel, collectionName, "for-each", element);

  const collection = viewModel[collectionName];
  if (!Array.isArray(collection)) {
    throw new InvalidPropertyTypeError({
      propertyName: collectionName,
      bindingKind: "for-each",
      expectedType: "an array",
      viewModelName: viewModel.constructor?.name ?? "Unknown",
      elementSnippet: element.outerHTML.substring(0, 50)
    });
  }

  const template = element.cloneNode(true) as HTMLElement;
  template.removeAttribute("for-each");

  console.log(
    `[pelela] for-each setup: ${itemName} of ${collectionName}, element:`,
    element.tagName,
    "parent:",
    element.parentNode?.nodeName,
  );

  if (!element.parentNode) {
    throw new InvalidDOMStructureError(
      "for-each",
      "element has no parent node"
    );
  }

  const placeholder = document.createComment(
    `for-each: ${itemName} of ${collectionName}`,
  );
  element.parentNode.insertBefore(placeholder, element);
  element.remove();

  return {
    collectionName,
    itemName,
    template,
    placeholder,
    renderedElements: [],
    previousLength: 0,
  };
}

export function setupForEachBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ForEachBinding[] {
  const bindings: ForEachBinding[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[for-each]");

  for (const element of elements) {
    const binding = setupSingleForEachBinding(element, viewModel);
    if (binding) {
      bindings.push(binding);
    }
  }

  return bindings;
}

function createNewElement<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  item: any,
  index: number,
): void {
  const element = binding.template.cloneNode(true) as HTMLElement;

  console.log(
    `[pelela] for-each creating element #${index}:`,
    element.tagName,
    "template:",
    binding.template.outerHTML,
  );

  const itemRef = { current: item };
  const extendedViewModel = createExtendedViewModel(
    viewModel,
    binding.itemName,
    itemRef,
  );

  const render = setupBindingsForElement(element, extendedViewModel);

  binding.renderedElements.push({
    element,
    viewModel: extendedViewModel,
    itemRef,
    render,
  });

  const lastElement =
    binding.renderedElements[binding.renderedElements.length - 2]
      ?.element || binding.placeholder;

  console.log(
    `[pelela] for-each inserting:`,
    element.tagName,
    "after:",
    lastElement.nodeName,
    "parent:",
    lastElement.parentNode?.nodeName,
  );

  if (lastElement.parentNode) {
    lastElement.parentNode.insertBefore(element, lastElement.nextSibling);
    console.log(
      `[pelela] for-each inserted successfully, element in DOM:`,
      element.parentNode?.nodeName,
    );
    render();
    console.log(`[pelela] for-each render called for element #${index}`);
  } else {
    console.warn(
      "[pelela] for-each: Could not insert element, parent node not found",
    );
  }
}

function addNewElements<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
  collection: any[],
  previousLength: number,
): void {
  for (let i = previousLength; i < collection.length; i++) {
    createNewElement(binding, viewModel, collection[i], i);
  }
}

function removeExtraElements(
  binding: ForEachBinding,
  currentLength: number,
): void {
  const toRemove = binding.renderedElements.splice(currentLength);
  for (const { element } of toRemove) {
    element.remove();
  }
}

function updateExistingElements(
  binding: ForEachBinding,
  collection: any[],
): void {
  for (let i = 0; i < binding.renderedElements.length; i++) {
    const item = collection[i];
    const rendered = binding.renderedElements[i];

    rendered.itemRef.current = item;
    rendered.render();
  }
}

function renderSingleForEachBinding<T extends object>(
  binding: ForEachBinding,
  viewModel: ViewModel<T>,
): void {
  const collection = viewModel[binding.collectionName];

  if (!Array.isArray(collection)) {
    console.warn(
      `[pelela] for-each render: Property "${binding.collectionName}" is not an array, skipping render`,
    );
    return;
  }

  const currentLength = collection.length;
  const previousLength = binding.previousLength;

  console.log(
    `[pelela] for-each render: ${binding.itemName} of ${binding.collectionName}, items: ${currentLength}, prev: ${previousLength}`,
  );

  if (currentLength > previousLength) {
    addNewElements(binding, viewModel, collection, previousLength);
  } else if (currentLength < previousLength) {
    removeExtraElements(binding, currentLength);
  }

  updateExistingElements(binding, collection);

  binding.previousLength = currentLength;
}

export function renderForEachBindings<T extends object>(
  bindings: ForEachBinding[],
  viewModel: ViewModel<T>,
): void {
  for (const binding of bindings) {
    renderSingleForEachBinding(binding, viewModel);
  }
}

