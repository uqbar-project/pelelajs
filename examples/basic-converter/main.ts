import './styles.css'
import { mountTemplate, setDebug } from 'pelelajs'
import template from './src/Converter.pelela'
import 'virtual:pelela-auto-register'

setDebug(true)
const root = document.getElementById('app') ?? document.body
mountTemplate(root, template)
