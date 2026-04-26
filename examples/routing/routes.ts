import type { RouteDefinition } from 'pelelajs'
import { Detail } from './src/detail'
import { DetailSpecial } from './src/detail-special'
import { Home } from './src/home'

export const routes: RouteDefinition[] = [
  { path: '/', component: Home },
  { path: '/users/:id', component: Detail },
  { path: '/special-users/:id', component: DetailSpecial },
  { path: '*', component: Home }, // Catch-all
]
