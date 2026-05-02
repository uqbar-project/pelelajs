import './styles.css'
import { mountTemplate } from 'pelelajs'
import template from './src/Converter.pelela'
import 'virtual:pelela-auto-register'

const root = document.getElementById('app') ?? document.body
mountTemplate(root, template)
