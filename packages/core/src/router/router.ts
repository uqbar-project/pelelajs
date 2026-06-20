import { resetRouterActive, setRouterActive } from '../bootstrap/bootstrap'
import { handleError, mountTemplate, renderErrorPage } from '../bootstrap/mountTemplate'
import {
  createStylesheetLink,
  findExistingStylesheetLink,
  removeStylesheetLinks,
} from '../commons/cssLoader'
import { RoutingError } from '../errors/RoutingError'
import {
  getComponentByTag,
  getComponentEntry,
  getRegisteredTags,
} from '../registry/componentRegistry'
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

function collectChildComponentCssUrls(template: string, visited = new Set<string>()): string[] {
  const tagRegex = (tag: string) => new RegExp(`<${tag}(?:[\\s>/])`)

  return getRegisteredTags()
    .filter((tag) => !visited.has(tag) && tagRegex(tag).test(template))
    .flatMap((tag) => {
      visited.add(tag)
      const componentDef = getComponentByTag(tag)
      const childCss = componentDef?.entry.template
        ? collectChildComponentCssUrls(componentDef.entry.template, visited)
        : []
      return [...(componentDef?.entry.cssUrls ?? []), ...childCss]
    })
}

function renderPath(pathname: string, search: string, nextPath?: string): void {
  try {
    const match = matchRoute(pathname, search, routes)

    const entry = getComponentEntry(match.route.component)
    if (!entry) {
      throw new RoutingError(match.route.component.name || 'Unknown', 'component-not-registered')
    }

    const oldRouteCss = new Set(currentRouteCss)
    currentRouteCss.clear()

    currentMatch = match
    mountTemplate(container!, entry.template)

    for (const cssUrl of oldRouteCss) {
      removeStylesheetLinks(cssUrl)
    }
    const routeCssUrls = entry.cssUrls ?? []
    const childCssUrls = collectChildComponentCssUrls(entry.template)
    const allCssUrls = [...routeCssUrls, ...childCssUrls]
    for (const cssUrl of allCssUrls) {
      currentRouteCss.add(cssUrl)
      const existingLink = findExistingStylesheetLink(cssUrl)
      if (!existingLink) {
        const linkElement = createStylesheetLink(cssUrl)
        document.head.appendChild(linkElement)
      }
    }

    if (nextPath) {
      history.pushState(null, '', nextPath)
    }
  } catch (error) {
    resetRouterActive()
    handleError(error)
  }
}

function resolveAndRender(): void {
  const { pathname, search } = window.location
  renderPath(pathname, search)
}

function validateRoutesHaveTemplates(routeDefs: RouteDefinition[]): void {
  const missingComponent = routeDefs.find((routeDef) => !getComponentEntry(routeDef.component))

  if (missingComponent) {
    const error = new RoutingError(
      missingComponent.component.name || 'Unknown',
      'component-not-registered',
    )
    console.error(error)
    renderErrorPage(error)
    throw error
  }
}

export const router = {
  /**
   * Configures the router and mounts the route matching the current URL.
   * All components must be registered with defineComponent() before calling start().
   */
  start(rootContainer: HTMLElement, routeDefs: RouteDefinition[]): void {
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
      setRouterActive()
      validateRoutesHaveTemplates(routeDefs)
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
    try {
      if (!container) {
        throw new RoutingError('navigateTo()', 'router-not-started')
      }

      const url = new URL(path, window.location.origin)
      renderPath(url.pathname, url.search, path)
    } catch (error) {
      handleError(error)
    }
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
    currentRouteCss.add(cssPath)
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
  resetRouterActive()
}
