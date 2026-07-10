import type { ViewModelConstructor } from '../types'

export type RouteDefinition = {
  path: string
  component?: ViewModelConstructor
  layout?: ViewModelConstructor
  children?: RouteDefinition[]
}

export type FlattenedRoute = {
  path: string
  component: ViewModelConstructor
  layout?: ViewModelConstructor
}

export type MatchedRoute = {
  route: FlattenedRoute
  urlParameters: Record<string, string>
  searchParameters: Record<string, string>
}
