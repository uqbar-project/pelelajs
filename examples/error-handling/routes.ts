import type { RouteDefinition } from 'pelelajs'
import { App } from './src/app'
import { BadBinding } from './src/bad-binding'
import { TextArea } from './src/text-area'

export const routes: RouteDefinition[] = [
  { path: '/', component: App },
  { path: '/text-area', component: TextArea },
  { path: '/bad-binding', component: BadBinding },
]
