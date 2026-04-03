import './styles.css'
import { defineViewModel, mountTemplate } from 'pelelajs'
import template from './src/Conversor.pelela'
import { Conversor } from './src/Example'

defineViewModel('Conversor', Conversor)

const root = document.getElementById('app') ?? document.body
mountTemplate(root, template)
