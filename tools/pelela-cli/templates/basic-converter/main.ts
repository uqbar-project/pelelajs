import './styles.css'
import { router } from 'pelelajs'
import 'virtual:pelela-auto-register'
import { routes } from './routes'

const root = document.getElementById('app') ?? document.body
router.start(root, routes)
