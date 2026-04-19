import { RoutingError } from '../errors/RoutingError'
import type { MatchedRoute, RouteDefinition } from './types'

type CompiledRoute = {
  route: RouteDefinition
  regex: RegExp
  paramNames: string[]
}

function compileRoute(route: RouteDefinition): CompiledRoute {
  if (route.path === '*') {
    return { route, regex: /^.*$/, paramNames: [] }
  }

  const paramNames: string[] = []

  const regexSource = route.path.replace(/:(\w+)/g, (_match, paramName: string) => {
    paramNames.push(paramName)
    return '([^/]+)'
  })

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
    params[name] = regexMatch[index + 1] ?? ''
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
  routes: RouteDefinition[],
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
