import './styles.css'
import { mountTemplate } from 'pelelajs'
import template from './src/app.pelela'
import 'virtual:pelela-auto-register'
import { router } from 'pelelajs'
import { routes } from './routes'

const root = document.getElementById('app') ?? document.body
mountTemplate(root, template)

router.start(root, routes)
