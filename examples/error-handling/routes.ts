import type { RouteDefinition } from 'pelelajs'
import { App } from './src/app'
import { BadBinding } from './src/bad-binding'
import { InvalidBindingTag } from './src/invalid-binding-tag'
import { InvalidPropBinding } from './src/invalid-prop-binding'
import { TextArea } from './src/text-area'

export const routes: RouteDefinition[] = [
  { path: '/', component: App },
  { path: '/text-area', component: TextArea },
  { path: '/invalid-prop-binding', component: InvalidPropBinding },
  { path: '/invalid-binding-tag', component: InvalidBindingTag },
  { path: '/bad-binding', component: BadBinding },
]
