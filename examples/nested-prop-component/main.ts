import './src/styles.css'
import { router } from 'pelelajs'
import { routes } from './routes'
import 'virtual:pelela-auto-register'

const root = document.getElementById('app') ?? document.body
router.start(root, routes)
