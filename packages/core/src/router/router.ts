import { mountTemplate } from '../bootstrap/mountTemplate'
import { RoutingError } from '../errors/RoutingError'
import { getComponentEntry } from '../registry/componentRegistry'
import { matchRoute } from './routeMatcher'
import type { MatchedRoute, RouteDefinition } from './types'

let container: HTMLElement | null = null
let routes: RouteDefinition[] = []
let currentMatch: MatchedRoute | null = null
let popstateHandler: (() => void) | null = null
const currentRouteCss = new Set<string>()

export function registerCss(cssPath: string): void {
  currentRouteCss.add(cssPath)
}

function createStylesheetLink(cssUrl: string): HTMLLinkElement {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = cssUrl
  link.setAttribute('data-pelela-css-url', cssUrl)
  return link
}

function removeCssElements(cssUrl: string): void {
  const matchingLinks = Array.from(
    document.querySelectorAll(`link[rel="stylesheet"][data-pelela-css-url="${cssUrl}"]`),
  )

  for (const element of matchingLinks) {
    void element.remove()
  }
}

function renderPath(pathname: string, search: string, nextPath?: string): void {
  const match = matchRoute(pathname, search, routes)

  const entry = getComponentEntry(match.route.component)
  if (!entry) {
    throw new RoutingError(match.route.component.name || 'Unknown', 'component-not-registered')
  }

  for (const cssUrl of currentRouteCss) {
    removeCssElements(cssUrl)
  }

  currentRouteCss.clear()
  const routeCssUrls = entry.cssUrls ?? []
  for (const cssUrl of routeCssUrls) {
    currentRouteCss.add(cssUrl)
    const existingLink = document.querySelector(
      `link[rel="stylesheet"][data-pelela-css-url="${cssUrl}"]`,
    ) as HTMLLinkElement | null
    if (!existingLink) {
      const linkElement = createStylesheetLink(cssUrl)
      document.head.appendChild(linkElement)
    }
  }

  currentMatch = match
  mountTemplate(container!, entry.template)

  if (nextPath) {
    history.pushState(null, '', nextPath)
  }
}

function resolveAndRender(): void {
  const { pathname, search } = window.location
  renderPath(pathname, search)
}

function validateRoutesHaveTemplates(routeDefs: RouteDefinition[]): void {
  const missingComponent = routeDefs.find((routeDef) => !getComponentEntry(routeDef.component))

  if (missingComponent) {
    throw new RoutingError(missingComponent.component.name || 'Unknown', 'component-not-registered')
  }
}

export const router = {
  /**
   * Configures the router and mounts the route matching the current URL.
   * All components must be registered with defineComponent() before calling start().
   */
  start(rootContainer: HTMLElement, routeDefs: RouteDefinition[]): void {
    validateRoutesHaveTemplates(routeDefs)

    if (popstateHandler) {
      window.removeEventListener('popstate', popstateHandler)
    }

    container = rootContainer
    routes = routeDefs

    popstateHandler = () => {
      resolveAndRender()
    }
    window.addEventListener('popstate', popstateHandler)

    try {
      resolveAndRender()
    } catch (error) {
      resetRouter()
      throw error
    }
  },

  /**
   * Programmatic navigation. Updates the URL and mounts the matching route.
   */
  navigateTo(path: string): void {
    if (!container) {
      throw new RoutingError('navigateTo()', 'router-not-started')
    }

    const url = new URL(path, window.location.origin)
    renderPath(url.pathname, url.search, path)
  },

  /**
   * Returns the dynamic URL segments from the current route.
   * For a route '/pais/:id' matching '/pais/42', returns { id: '42' }.
   */
  urlParameters(): Record<string, string> {
    return currentMatch?.urlParameters ?? {}
  },

  /**
   * Returns the query parameters from the current URL.
   * For '?nombre=Juan&apellido=Cont', returns { nombre: 'Juan', apellido: 'Cont' }.
   */
  searchParameters(): Record<string, string> {
    return currentMatch?.searchParameters ?? {}
  },

  registerCss(cssPath: string): void {
    registerCss(cssPath)
  },
}

/**
 * Resets all router state. For testing only.
 */
export function resetRouter(): void {
  if (popstateHandler) {
    window.removeEventListener('popstate', popstateHandler)
  }
  container = null
  routes = []
  currentMatch = null
  popstateHandler = null
  currentRouteCss.clear()
}
