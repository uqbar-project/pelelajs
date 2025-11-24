export function assertViewModelProperty(
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

