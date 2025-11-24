export function setupClickBindings(root: HTMLElement, viewModel: any): void {
  const elements = root.querySelectorAll<HTMLElement>("[click]");

  for (const element of elements) {
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
}

