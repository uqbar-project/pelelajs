import './styles.css'
import { mountTemplate, renderErrorPage, router } from 'pelelajs'
import template from './src/app.pelela'
import 'virtual:pelela-auto-register'

const root = document.getElementById('app') ?? document.body
mountTemplate(root, template)

// The catch belongs to the import only: a broken routes module (forgotten
// import, misspelled name) lands on Pelela's error page instead of a blank
// screen. router.start renders its own errors, so it stays outside.
const routesModule = await import('./routes').catch((error: unknown) => {
  renderErrorPage(error)
  return null
})
if (routesModule !== null) {
  router.start(root, routesModule.routes)
}
