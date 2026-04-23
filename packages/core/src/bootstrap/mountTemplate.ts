import { sanitizeHTML } from '../commons/sanitization'
import { bootstrap } from './bootstrap'

export function mountTemplate(container: HTMLElement, templateHtml: string): void {
  const sanitizedHtml = sanitizeHTML(templateHtml)
  container.innerHTML = sanitizedHtml
  bootstrap({ root: container })
}
