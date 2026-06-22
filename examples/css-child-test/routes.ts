import type { RouteDefinition } from 'pelelajs'
import { Detail } from './src/detail'
import { Home } from './src/home'

export const routes: RouteDefinition[] = [
  { path: '/', component: Home },
  { path: '/detail', component: Detail },
]
