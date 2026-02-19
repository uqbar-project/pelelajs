export function isInsideComponent(element: Element, root: Element): boolean {
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

