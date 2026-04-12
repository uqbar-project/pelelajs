import './styles.css'
import { defineViewModel, mountTemplate } from 'pelelajs'
import { Example } from './src/Example'
import template from './src/Example.pelela'

defineViewModel('Example', Example)

const root = document.getElementById('app') ?? document.body
mountTemplate(root, template)
