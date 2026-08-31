import { isPelelaRootTag, isStandardHtmlTag } from '../commons/dom'
import { initializeI18n, t } from '../commons/i18n'
import { sanitizeHTML } from '../commons/sanitization'
import { bootstrap } from './bootstrap'
import { renderErrorPage } from './errorPage'

function isInsideRoot(index: number, templateHtml: string, pelelaMatch: RegExpMatchArray): boolean {
  if (pelelaMatch.index === undefined) return false
  const rootTag = templateHtml[pelelaMatch.index + 1] === 'p' ? 'pelela' : 'component'
  const closeTag = `</${rootTag}>`

  let depth = 0
  let i = pelelaMatch.index
  while (i < templateHtml.length) {
    if (
      templateHtml.startsWith(`<${rootTag}`, i) &&
      /[\s>]/.test(templateHtml[i + rootTag.length + 1] ?? '')
    ) {
      depth++
    } else if (templateHtml.startsWith(closeTag, i)) {
      depth--
      if (depth === 0) {
        return index > pelelaMatch.index && index < i + closeTag.length
      }
    }
    i++
  }
  return false
}

function isInsideAnyRoot(
  index: number,
  templateHtml: string,
  pelelaMatches: RegExpMatchArray[],
): boolean {
  return pelelaMatches.some((pelelaMatch) => isInsideRoot(index, templateHtml, pelelaMatch))
}

function validateNoDirectivesOutsideRoot(templateHtml: string): void {
  const pelelaMatches = Array.from(templateHtml.matchAll(/<(?:pelela|component)\b/g))

  const directivePatterns = [
    /\bprop-[a-zA-Z0-9_-]+\b/g,
    /\blink-[a-zA-Z0-9_-]+\b/g,
    /\bconst-[a-zA-Z0-9_-]+\b/g,
    /\bbind-[a-zA-Z0-9_-]+\b/g,
    /\bfor-each\s*=\s*"/g,
    /\bfor-each\s*='/g,
    /\bif\s*=\s*"/g,
    /\bif\s*='/g,
  ]

  directivePatterns.forEach((pattern) => {
    const matches = templateHtml.matchAll(pattern)
    for (const match of matches) {
      const directiveIndex = match.index

      if (!isInsideAnyRoot(directiveIndex, templateHtml, pelelaMatches)) {
        const directive = match[0]
        throw new Error(
          t('errors.compiler.directiveOutsideRoot', {
            filePath: 'runtime',
            tagName: 'pelela',
            directive,
            snippet: templateHtml.slice(
              Math.max(0, directiveIndex - 20),
              Math.min(templateHtml.length, directiveIndex + 20),
            ),
          }),
        )
      }
    }
  })
}

function validateNoComponentsOutsideRoot(templateHtml: string): void {
  const pelelaMatches = Array.from(templateHtml.matchAll(/<(?:pelela|component)\b/g))

  const componentPattern = /<([\w-]+)([^>]*)>/g

  const matches = templateHtml.matchAll(componentPattern)
  for (const match of matches) {
    const tagName = match[1].toLowerCase()
    const attributes = match[2]
    const componentIndex = match.index

    const isRootTag = isPelelaRootTag(tagName)
    const isStandardTag = isStandardHtmlTag(tagName)

    if (!isRootTag && !isStandardTag) {
      const hasComponentAttributes = /prop-|link-|const-/.test(attributes)
      if (hasComponentAttributes && !isInsideAnyRoot(componentIndex, templateHtml, pelelaMatches)) {
        throw new Error(
          t('errors.compiler.directiveOutsideRoot', {
            filePath: 'runtime',
            tagName: 'pelela',
            directive: `component <${tagName}> with component attributes`,
            snippet: `<${tagName}${attributes}>`,
          }),
        )
      }
    }
  }
}

export function mountTemplate(container: HTMLElement, templateHtml: string): void {
  try {
    initializeI18n()
    validateNoDirectivesOutsideRoot(templateHtml)
    validateNoComponentsOutsideRoot(templateHtml)
    const sanitizedHtml = sanitizeHTML(templateHtml)
    container.innerHTML = sanitizedHtml
    bootstrap({ root: container })
  } catch (error) {
    renderErrorPage(error, container)
  }
}
