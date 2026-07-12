import { getNestedProperty, setNestedProperty } from '../bindings/nestedProperties'
import { resetRouterActive, setRouterActive } from '../bootstrap/bootstrap'
import { handleError, mountTemplate, renderErrorPage } from '../bootstrap/mountTemplate'
import {
  createStylesheetLink,
  findExistingStylesheetLink,
  removeStylesheetLinks,
} from '../commons/cssLoader'
import { CONST_PREFIX, LINK_PREFIX, PROP_PREFIX } from '../commons/dom'
import { toCamelCase, toKebabCase } from '../commons/helpers'
import { t } from '../commons/i18n'
import { isUnsafeKey } from '../commons/sanitization'
import { RoutingError } from '../errors/RoutingError'
import {
  getComponentByTag,
  getComponentEntry,
  getRegisteredTags,
} from '../registry/componentRegistry'
import type { PelelaElement, ViewModelConstructor } from '../types'
import { flattenRoutes, matchRoute } from './routeMatcher'
import type { FlattenedRoute, MatchedRoute, RouteDefinition } from './types'

interface OutletBinding {
  type: 'prop' | 'const' | 'link'
  pageProperty: string
  sourceExpression: string
}

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

function isNumberConstant(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Number(value))
}

function getOutletBindingType(attrName: string): 'prop' | 'const' | 'link' | undefined {
  if (attrName.startsWith(PROP_PREFIX)) return 'prop'
  if (attrName.startsWith(CONST_PREFIX)) return 'const'
  if (attrName.startsWith(LINK_PREFIX)) return 'link'
  return undefined
}

function getOutletBindingPageProperty(attrName: string): string | undefined {
  let result: string | undefined
  if (attrName.startsWith(PROP_PREFIX)) result = PROP_PREFIX
  if (attrName.startsWith(CONST_PREFIX)) result = CONST_PREFIX
  if (attrName.startsWith(LINK_PREFIX)) result = LINK_PREFIX
  return result ? toCamelCase(attrName.slice(result.length)) : undefined
}

function parseOutletBindings(layoutTemplate: string): OutletBinding[] {
  const outletRegex = /<outlet\b([^>]*)\/?>/i
  const outletMatch = layoutTemplate.match(outletRegex)
  if (!outletMatch) return []

  const attrsString = outletMatch[1].trim()
  if (!attrsString) return []

  const attrRegex = /(\S+)\s*=\s*"([^"]*)"|(\S+)\s*=\s*'([^']*)'/g
  const matches = Array.from(attrsString.matchAll(attrRegex))
  return matches.flatMap((match) => {
    const name = match[1] || match[3]
    const value = match[2] || match[4]
    const type = getOutletBindingType(name)
    const pageProperty = getOutletBindingPageProperty(name)
    return type && pageProperty ? [{ type, pageProperty, sourceExpression: value }] : []
  })
}

function setupLinkPropagation(
  pageViewModel: Record<string, unknown>,
  layoutViewModel: Record<string, unknown>,
  pageProperty: string,
  sourceExpression: string,
): void {
  const rawTarget = (pageViewModel as Record<string, unknown>).$raw as
    | Record<string, unknown>
    | undefined
  if (!rawTarget) return

  let internalValue = rawTarget[pageProperty]

  Object.defineProperty(rawTarget, pageProperty, {
    get() {
      return internalValue
    },
    set(newValue: unknown) {
      if (internalValue !== newValue) {
        internalValue = newValue
        setNestedProperty(layoutViewModel, sourceExpression, newValue)
      }
    },
    enumerable: true,
    configurable: true,
  })
}

function setupOutletBindings(rootContainer: HTMLElement, outletBindings: OutletBinding[]): void {
  if (outletBindings.length === 0) return

  const layoutElement = rootContainer.querySelector('pelela[view-model]') as PelelaElement | null
  if (!layoutElement) return

  const pageElement = layoutElement.querySelector('pelela[view-model]') as PelelaElement | null
  if (!pageElement) return

  const layoutViewModel = layoutElement.__pelelaViewModel as Record<string, unknown>
  const pageViewModel = pageElement.__pelelaViewModel as Record<string, unknown>
  if (!layoutViewModel || !pageViewModel) return

  outletBindings
    .filter((binding) => !isUnsafeKey(binding.pageProperty))
    .forEach((binding) => {
      const value =
        binding.type === 'const'
          ? isNumberConstant(binding.sourceExpression)
            ? Number(binding.sourceExpression)
            : binding.sourceExpression
          : getNestedProperty(layoutViewModel, binding.sourceExpression)

      pageViewModel[binding.pageProperty] = value

      if (binding.type === 'link') {
        setupLinkPropagation(
          pageViewModel,
          layoutViewModel,
          binding.pageProperty,
          binding.sourceExpression,
        )
      }
    })
}

function combineLayoutAndPage(layoutTemplate: string, pageTemplate: string): string {
  const outletRegex = /<outlet\b[^>]*\/?>(?:\s*<\/outlet\s*>)?/i
  if (!outletRegex.test(layoutTemplate)) {
    throw new Error(t('errors.routing.layoutMissingOutlet'))
  }

  return layoutTemplate.replace(outletRegex, pageTemplate)
}

function loadRouteCss(entry: { cssUrls?: string[]; template: string }): void {
  const childCssUrls = collectChildComponentCssUrls(entry.template)
  const allCssUrls = [...(entry.cssUrls ?? []), ...childCssUrls]
  for (const cssUrl of allCssUrls) {
    currentRouteCss.add(cssUrl)
    const existingLink = findExistingStylesheetLink(cssUrl)
    if (!existingLink) {
      document.head.appendChild(createStylesheetLink(cssUrl))
    }
  }
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

    for (const cssUrl of oldRouteCss) {
      removeStylesheetLinks(cssUrl)
    }

    if (match.route.layout) {
      const layoutEntry = getComponentEntry(match.route.layout)
      if (!layoutEntry) {
        throw new RoutingError(match.route.layout.name || 'Unknown', 'component-not-registered')
      }

      const outletBindings = parseOutletBindings(layoutEntry.template)
      const combinedHtml = combineLayoutAndPage(layoutEntry.template, pageEntry.template)
      mountTemplate(container!, combinedHtml)
      setupOutletBindings(container!, outletBindings)
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

function validateRoutesHaveTemplates(routeDefs: RouteDefinition[]): void {
  for (const routeDef of routeDefs) {
    if (routeDef.layout && !routeDef.children) {
      throw new Error(t('errors.routing.layoutWithoutChildren'))
    }
    if (routeDef.children && !routeDef.layout) {
      throw new Error(t('errors.routing.childrenWithoutLayout'))
    }
    if (routeDef.layout) assertComponentIsRegistered(routeDef.layout)
    if (routeDef.component) assertComponentIsRegistered(routeDef.component)
    if (routeDef.children) validateRoutesHaveTemplates(routeDef.children)
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

    popstateHandler = () => {
      resolveAndRender()
    }
    window.addEventListener('popstate', popstateHandler)

    try {
      setRouterActive()
      flatRoutes = flattenRoutes(routeDefs)
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
  flatRoutes = []
  currentMatch = null
  popstateHandler = null
  currentRouteCss.clear()
  resetRouterActive()
}
