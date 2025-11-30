import type { ViewModel } from "./types";
import { InvalidHandlerError } from "../errors/index";

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
        throw new InvalidHandlerError(
          handlerName,
          viewModel.constructor?.name ?? "Unknown",
          "click",
        );
      }

      handler.call(viewModel, event);
    });
  }
}

