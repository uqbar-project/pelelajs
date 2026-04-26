import './styles.css'
import { mountTemplate } from 'pelelajs'
import 'virtual:pelela-auto-register'
import template from './src/Example.pelela'

const root = document.getElementById('app') ?? document.body
mountTemplate(root, template)
