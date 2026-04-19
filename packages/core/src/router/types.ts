import type { ViewModelConstructor } from '../types'

export type RouteDefinition = {
  path: string
  component: ViewModelConstructor
}

export type MatchedRoute = {
  route: RouteDefinition
  urlParameters: Record<string, string>
  searchParameters: Record<string, string>
}
