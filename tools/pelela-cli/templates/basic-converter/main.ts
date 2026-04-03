import './styles.css'
import { defineViewModel, mountTemplate } from 'pelelajs'
import template from './src/Example.pelela'
import { Example } from './src/Example'

defineViewModel('Example', Example)

const root = document.getElementById('app') ?? document.body
mountTemplate(root, template)
