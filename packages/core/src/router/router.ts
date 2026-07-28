import { resetRouterActive, setRouterActive } from '../bootstrap/bootstrap'
import { handleError, mountTemplate, renderErrorPage } from '../bootstrap/mountTemplate'
import {
  createStylesheetLink,
  findExistingStylesheetLink,
  removeStylesheetLinks,
} from '../commons/cssLoader'
import { toKebabCase } from '../commons/helpers'
import { t } from '../commons/i18n'
import { RoutingError } from '../errors/RoutingError'
import {
  getComponentByTag,
  getComponentEntry,
  getComponentTag,
  getRegisteredTags,
} from '../registry/componentRegistry'
import type { ViewModelConstructor } from '../types'
import { flattenRoutes, matchRoute } from './routeMatcher'
import type { FlattenedRoute, MatchedRoute, RouteDefinition } from './types'

let container: HTMLElement | null = null
let flatRoutes: FlattenedRoute[] = []
let currentMatch: MatchedRoute | null = null
let popstateHandler: (() => void) | null = null
const currentRouteCss = new Set<string>()

export function registerCss(cssPath: string): void {
  currentRouteCss.add(cssPath)
}

function collectChildComponentCssUrls(rawTemplate: string, visited = new Set<string>()): string[] {
  const template = rawTemplate.replace(
    /<\s*(\w+)/g,
    (_, tagName: string) => `<${toKebabCase(tagName)}`,
  )
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

function replaceOutletWithPageTag(layoutTemplate: string, pageTag: string): string {
  if (!/<outlet\b/i.test(layoutTemplate)) {
    throw new Error(t('errors.routing.layoutMissingOutlet'))
  }

  const normalized = layoutTemplate.replace(/<outlet\b([^>]*)\/>/gi, '<outlet$1></outlet>')
  return normalized
    .replace(/<outlet\b/gi, `<${pageTag}`)
    .replace(/<\/outlet\s*>/gi, `</${pageTag}>`)
}

function loadRouteCss(entry: { cssUrls?: string[]; template: string }): void {
  const childCssUrls = collectChildComponentCssUrls(entry.template)
  const allCssUrls = [...(entry.cssUrls ?? []), ...childCssUrls]
  allCssUrls.forEach((cssUrl) => {
    currentRouteCss.add(cssUrl)
    const existingLink = findExistingStylesheetLink(cssUrl)
    if (!existingLink) {
      document.head.appendChild(createStylesheetLink(cssUrl))
    }
  })
}

function renderPath(pathname: string, search: string, nextPath?: string): void {
  try {
    const match = matchRoute(pathname, search, flatRoutes)

    const pageEntry = getComponentEntry(match.route.component)
    if (!pageEntry) {
      throw new RoutingError(match.route.component.name || 'Unknown', 'component-not-registered')
    }

    const oldRouteCss = new Set(currentRouteCss)
    currentRouteCss.clear()

    currentMatch = match

    if (nextPath) {
      history.pushState(null, '', nextPath)
    }

    oldRouteCss.forEach((cssUrl) => {
      removeStylesheetLinks(cssUrl)
    })

    if (match.route.layout) {
      const layoutEntry = getComponentEntry(match.route.layout)
      if (!layoutEntry) {
        throw new RoutingError(match.route.layout.name || 'Unknown', 'component-not-registered')
      }

      const pageTag = getComponentTag(match.route.component)
      if (!pageTag) {
        throw new RoutingError(match.route.component.name || 'Unknown', 'component-not-registered')
      }
      const combinedHtml = replaceOutletWithPageTag(layoutEntry.template, pageTag)
      mountTemplate(container!, combinedHtml)
      loadRouteCss(layoutEntry)
    } else {
      mountTemplate(container!, pageEntry.template)
    }

    loadRouteCss(pageEntry)
  } catch (error) {
    resetRouterActive()
    handleError(error)
  }
}

function resolveAndRender(): void {
  const { pathname, search } = window.location
  renderPath(pathname, search)
}

function assertComponentIsRegistered(viewModel: ViewModelConstructor): void {
  if (!getComponentEntry(viewModel)) {
    const error = new RoutingError(viewModel.name || 'Unknown', 'component-not-registered')
    console.error(error)
    renderErrorPage(error)
    throw error
  }
}

function assertLayoutHasChildren(routeDef: RouteDefinition): void {
  if (routeDef.layout && (!routeDef.children || routeDef.children.length === 0)) {
    throw new Error(t('errors.routing.layoutWithoutChildren'))
  }
}

function assertChildrenHaveLayout(routeDef: RouteDefinition): void {
  if (routeDef.children && !routeDef.layout) {
    throw new Error(t('errors.routing.childrenWithoutLayout'))
  }
}

function assertNoComponentWithChildren(routeDef: RouteDefinition): void {
  if (routeDef.component && routeDef.children) {
    throw new Error(t('errors.routing.routeWithChildrenAndComponent'))
  }
}

function assertNoNestedLayouts(
  routeDef: RouteDefinition,
  parentLayout?: ViewModelConstructor,
): void {
  if (routeDef.layout && parentLayout) {
    throw new Error(t('errors.routing.nestedLayoutsNotSupported'))
  }
}

function assertOutletHasNoChildren(layoutCreator: ViewModelConstructor): void {
  const entry = getComponentEntry(layoutCreator)
  if (!entry) return

  const template = entry.template
  const outletPattern = /<outlet\b[^>]*>([\s\S]*?)<\/outlet\s*>|<outlet\b[^>]*\/?>/i
  const match = template.match(outletPattern)
  if (match && match[1] !== undefined && match[1].trim().length > 0) {
    throw new Error(t('errors.routing.outletWithChildren'))
  }
}

function assertSingleOutlet(layoutCreator: ViewModelConstructor): void {
  const entry = getComponentEntry(layoutCreator)
  if (!entry) return

  const outletCount = (entry.template.match(/<outlet\b/gi) || []).length
  if (outletCount !== 1) {
    throw new Error(t('errors.routing.multipleOutlets', { count: outletCount }))
  }
}

function validateRoutes(routeDefs: RouteDefinition[], parentLayout?: ViewModelConstructor): void {
  routeDefs.forEach((routeDef) => {
    assertLayoutHasChildren(routeDef)
    assertChildrenHaveLayout(routeDef)
    assertNoComponentWithChildren(routeDef)
    assertNoNestedLayouts(routeDef, parentLayout)
    if (routeDef.layout) {
      assertComponentIsRegistered(routeDef.layout)
      assertOutletHasNoChildren(routeDef.layout)
      assertSingleOutlet(routeDef.layout)
    }
    if (routeDef.component) assertComponentIsRegistered(routeDef.component)
    if (routeDef.children) {
      validateRoutes(routeDef.children, routeDef.layout ?? parentLayout)
    }
  })
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

    popstateHandler = () => {
      resolveAndRender()
    }
    window.addEventListener('popstate', popstateHandler)

    try {
      setRouterActive()
      validateRoutes(routeDefs)
      flatRoutes = flattenRoutes(routeDefs)
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
  flatRoutes = []
  currentMatch = null
  popstateHandler = null
  currentRouteCss.clear()
  resetRouterActive()
}
