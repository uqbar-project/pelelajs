import type { RouteDefinition } from 'pelelajs'
import { Base } from './src/base'

export const routes: RouteDefinition[] = [
  { path: '/', component: Base },
  { path: '*', component: Base },
]
