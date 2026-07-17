import { t } from '../commons/i18n'
import { RoutingError } from '../errors/RoutingError'
import type { ViewModelConstructor } from '../types'
import type { FlattenedRoute, MatchedRoute, RouteDefinition } from './types'

type CompiledRoute = {
  route: FlattenedRoute
  regex: RegExp
  paramNames: string[]
}
export function joinPaths(parent: string, child: string): string {
  const combined = parent.endsWith('/') || parent === '' ? parent + child : `${parent}/${child}`
  const result = combined.replace(/\/+/g, '/') || '/'
  if (result === '*') return result
  return result.startsWith('/') ? result : `/${result}`
}
export function flattenRoutes(
  routes: RouteDefinition[],
  parentPath: string = '',
  parentLayout?: ViewModelConstructor,
): FlattenedRoute[] {
  return routes.flatMap((route) => {
    const fullPath = joinPaths(parentPath, route.path)
    const layout = route.layout ?? parentLayout

    if (route.children) {
      if (route.component) {
        throw new Error(t('errors.routing.routeWithChildrenAndComponent'))
      }
      if (route.layout && parentLayout) {
        throw new Error(t('errors.routing.nestedLayoutsNotSupported'))
      }
      return flattenRoutes(route.children, fullPath, layout)
    }

    return [{ path: fullPath, component: route.component, layout }]
  })
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mapSegmentToRegex(segment: string, paramNames: string[]): string {
  if (segment.startsWith(':')) {
    paramNames.push(segment.substring(1))
    return '([^/]+)'
  }
  return escapeRegex(segment)
}

function compileRoute(route: FlattenedRoute): CompiledRoute {
  if (route.path === '*') {
    return { route, regex: /^.*$/, paramNames: [] }
  }

  if (route.path.endsWith('/*')) {
    const prefix = route.path.slice(0, -2)
    return {
      route,
      regex: new RegExp(`^${escapeRegex(prefix)}(?:/.*)?$`),
      paramNames: [],
    }
  }

  const paramNames: string[] = []
  const segments = route.path.split(/(:\w+)/g)
  const regexSource = segments.map((segment) => mapSegmentToRegex(segment, paramNames)).join('')

  return {
    route,
    regex: new RegExp(`^${regexSource}\\/?$`),
    paramNames,
  }
}

function extractUrlParameters(
  regexMatch: RegExpMatchArray,
  paramNames: string[],
): Record<string, string> {
  return paramNames.reduce<Record<string, string>>((params, name, index) => {
    const rawValue = regexMatch[index + 1] ?? ''
    try {
      params[name] = decodeURIComponent(rawValue)
    } catch {
      params[name] = rawValue
    }
    return params
  }, {})
}

function extractSearchParameters(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search))
}

/**
 * Matches a pathname against a list of route definitions.
 * Routes are evaluated in definition order (first match wins).
 * Throws RoutingError if no route matches.
 */
export function matchRoute(
  pathname: string,
  search: string,
  routes: FlattenedRoute[],
): MatchedRoute {
  const normalizedPath = pathname === '' ? '/' : pathname
  const compiled = routes.map(compileRoute)

  const found = compiled
    .map((entry) => ({ entry, match: normalizedPath.match(entry.regex) }))
    .find((result) => result.match !== null)

  if (!found?.match) {
    throw new RoutingError(normalizedPath, 'route-not-found')
  }

  return {
    route: found.entry.route,
    urlParameters: extractUrlParameters(found.match, found.entry.paramNames),
    searchParameters: extractSearchParameters(search),
  }
}
