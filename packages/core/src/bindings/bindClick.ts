import type { ViewModel } from "./types";

export function setupClickBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): void {
  const elements = root.querySelectorAll<HTMLElement>("[click]");

  for (const element of elements) {
    const handlerName = element.getAttribute("click");
    if (!handlerName) continue;

    element.addEventListener("click", (event) => {
      const handler = viewModel[handlerName];

      if (typeof handler !== "function") {
        throw new Error(
          `[pelela] Handler "${handlerName}" definido en click="..." no es una función ` +
          `del view model "${viewModel.constructor?.name ?? "Unknown"}".`,
        );
      }

      handler.call(viewModel, event);
    });
  }
}

