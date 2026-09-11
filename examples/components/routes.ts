import type { RouteDefinition } from 'pelelajs'
import { Dashboard } from './src/dashboard/dashboard'
import { Home } from './src/home'

export const routes: RouteDefinition[] = [
  { path: '/', component: Home },
  { path: '/dashboard', component: Dashboard },
]
