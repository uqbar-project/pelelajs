import type { ViewModelConstructor } from '../types'

export type RouteDefinition =
  | { path: string; component: ViewModelConstructor; layout?: undefined; children?: undefined }
  | {
      path: string
      layout: ViewModelConstructor
      children: RouteDefinition[]
      component?: undefined
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
