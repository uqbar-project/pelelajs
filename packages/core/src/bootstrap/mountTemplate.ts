import { isNativeTag, isPelelaRootTag } from '../commons/dom'
import { initializeI18n, t } from '../commons/i18n'
import { sanitizeHTML } from '../commons/sanitization'
import { bootstrap } from './bootstrap'
import { renderErrorPage } from './errorPage'

type RootTagName = 'pelela' | 'component'

// The match starts at '<', so its second character tells which root tag opened.
function rootTagAt(templateHtml: string, matchIndex: number): RootTagName {
  return templateHtml[matchIndex + 1] === 'p' ? 'pelela' : 'component'
}

// An open tag only counts when a word boundary follows, so `<pelela-x` never matches `<pelela`.
function isOpenRootTagAt(templateHtml: string, position: number, rootTag: string): boolean {
  return (
    templateHtml.startsWith(`<${rootTag}`, position) &&
    /[\s>]/.test(templateHtml[position + rootTag.length + 1] ?? '')
  )
}

// Scans forward tracking nesting depth to find where this root actually closes.
function findMatchingCloseIndex(
  templateHtml: string,
  rootStart: number,
  rootTag: string,
  closeTag: string,
): number | undefined {
  let depth = 0
  let position = rootStart
  while (position < templateHtml.length) {
    if (isOpenRootTagAt(templateHtml, position, rootTag)) {
      depth++
    } else if (templateHtml.startsWith(closeTag, position)) {
      depth--
      if (depth === 0) return position
    }
    position++
  }
  return undefined
}

function isInsideRoot(index: number, templateHtml: string, pelelaMatch: RegExpMatchArray): boolean {
  if (pelelaMatch.index === undefined) return false
  const rootTag = rootTagAt(templateHtml, pelelaMatch.index)
  const closeTag = `</${rootTag}>`
  const closeIndex = findMatchingCloseIndex(templateHtml, pelelaMatch.index, rootTag, closeTag)
  if (closeIndex === undefined) return false
  return index > pelelaMatch.index && index < closeIndex + closeTag.length
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
    const isNative = isNativeTag(tagName)

    if (!isRootTag && !isNative) {
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
