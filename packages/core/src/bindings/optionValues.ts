const optionToValue = new WeakMap<HTMLOptionElement, unknown>()

export function setOptionValue(option: HTMLOptionElement, value: unknown): void {
  optionToValue.set(option, value)
}

export function getOptionValue(option: HTMLOptionElement): unknown {
  return optionToValue.get(option)
}

export function hasOptionValue(option: HTMLOptionElement): boolean {
  return optionToValue.has(option)
}
