import { initializeI18n } from '../commons/i18n'
import { sanitizeHTML } from '../commons/sanitization'
import { bootstrap } from './bootstrap'

export function mountTemplate(container: HTMLElement, templateHtml: string): void {
  initializeI18n()
  const sanitizedHtml = sanitizeHTML(templateHtml)
  container.innerHTML = sanitizedHtml
  bootstrap({ root: container })
}
