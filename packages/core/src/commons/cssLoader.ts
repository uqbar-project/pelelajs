const STYLESHEET_LINK_SELECTOR = (cssUrl: string): string =>
  `link[rel="stylesheet"][data-pelela-css-url="${cssUrl}"]`

export function createStylesheetLink(cssUrl: string): HTMLLinkElement {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = cssUrl
  link.setAttribute('data-pelela-css-url', cssUrl)
  return link
}

export function findExistingStylesheetLink(cssUrl: string): HTMLLinkElement | null {
  return document.querySelector(STYLESHEET_LINK_SELECTOR(cssUrl)) as HTMLLinkElement | null
}

export function removeStylesheetLinks(cssUrl: string): void {
  const matchingLinks = Array.from(document.querySelectorAll(STYLESHEET_LINK_SELECTOR(cssUrl)))

  for (const element of matchingLinks) {
    void element.remove()
  }
}
