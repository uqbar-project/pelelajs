import type { RouteDefinition } from 'pelelajs'
import { App } from './src/app'
import { BadBinding } from './src/bad-binding'
import { BadConstParent } from './src/bad-const-parent'
import { BadParentNoChild } from './src/bad-parent-no-child'
import { BadPropParent } from './src/bad-prop-parent'
import { InvalidBindingTag } from './src/invalid-binding-tag'
import { InvalidPropBinding } from './src/invalid-prop-binding'
import { OutsidePelela } from './src/outside-pelela'
import { TextArea } from './src/text-area'

export const routes: RouteDefinition[] = [
  { path: '/', component: App },
  { path: '/text-area', component: TextArea },
  { path: '/invalid-prop-binding', component: InvalidPropBinding },
  { path: '/invalid-binding-tag', component: InvalidBindingTag },
  { path: '/bad-binding', component: BadBinding },
  { path: '/bad-prop-parent', component: BadPropParent },
  { path: '/bad-parent-no-child', component: BadParentNoChild },
  { path: '/bad-const-parent', component: BadConstParent },
  { path: '/outside-pelela', component: OutsidePelela },
]
