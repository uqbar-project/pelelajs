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

// View-model failure fixtures. Uncomment BOTH the import below AND its route
// at the bottom, one case at a time. Uncommenting only the route throws a plain
// ReferenceError: without its import the name does not exist (standard JavaScript).
// See README.md for the student walkthrough.
// import { BadViewmodelFunction } from './src/bad-viewmodel-function'
// import { BadViewmodelNoExport } from './src/bad-viewmodel-no-export'
// import { BadViewmodelMissing } from './src/bad-viewmodel-not-found'
import { BadViewmodelObject } from './src/bad-viewmodel-object'

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
  // Uncomment one fixture at a time together with its import above.
  { path: '/bad-viewmodel-object', component: BadViewmodelObject },
  // { path: '/bad-viewmodel-function', component: BadViewmodelFunction },
  // { path: '/bad-viewmodel-no-export', component: BadViewmodelNoExport },
  // { path: '/bad-viewmodel-not-found', component: BadViewmodelMissing },
]
