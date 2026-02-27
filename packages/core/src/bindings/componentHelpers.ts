export function isInsideComponent(element: Element, root: Element): boolean {
  if (element === root) {
    return false
  }

  if (element.hasAttribute('data-pelela-component')) {
    return true
  }

  let current: Element | null = element.parentElement

  while (current && current !== root) {
    if (current.hasAttribute('data-pelela-component')) {
      return true
    }
    current = current.parentElement
  }

  return false
}

export function querySelectorAllInclusive(root: HTMLElement, selector: string): HTMLElement[] {
  const descendants = Array.from(root.querySelectorAll<HTMLElement>(selector))
  if (root.matches(selector)) {
    return [root, ...descendants]
  }
  return descendants
}
