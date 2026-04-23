import * as fs from 'node:fs'
import path from 'node:path'
import { initializeI18n, t } from 'pelelajs'
import type { Plugin } from 'vite'

function escapeTemplateForLiteral(html: string): string {
  return html.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function getCssImport(pelelaFilePath: string): string {
  const cssFile = pelelaFilePath.replace(/\.pelela$/, '.css')
  if (fs.existsSync(cssFile)) {
    const cssBase = path.basename(cssFile)
    return `import "./${cssBase}";\n`
  }
  return ''
}

function isStandardHtmlTag(tagName: string): boolean {
  // biome-ignore format: <line length exceeds 100 due to comprehensive HTML tags list>
  const standardHtmlTags = [
    'html', 'head', 'title', 'body', 'div', 'span', 'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'a', 'img', 'script', 'style', 'link', 'meta', 'base', 'form', 'input',
    'button', 'select', 'option', 'textarea', 'label', 'table', 'tr', 'td',
    'th', 'thead', 'tbody', 'tfoot', 'caption', 'col', 'colgroup', 'section',
    'article', 'nav', 'aside', 'header', 'footer', 'main', 'figure', 'figcaption',
    'iframe', 'canvas', 'svg', 'math', 'video', 'audio', 'source', 'track',
    'map', 'area', 'object', 'param', 'embed', 'details', 'summary', 'dialog',
    'template', 'slot', 'time', 'data', 'code', 'pre', 'blockquote', 'q',
    'cite', 'abbr', 'address', 'bdo', 'ins', 'del', 'small', 'strong', 'em',
    'mark', 'sub', 'sup', 'var', 'samp', 'kbd', 'output', 'progress', 'meter',
    'fieldset', 'legend', 'optgroup', 'datalist', 'keygen', 'textarea', 'label',
  ]
  return standardHtmlTags.includes(tagName.toLowerCase())
}

function isRootPelelaOrComponent(tagName: string): boolean {
  return tagName.toLowerCase() === 'pelela' || tagName.toLowerCase() === 'component'
}

function extractLinkAttributeMatches(
  sourceCode: string,
): Array<{ tagName: string; attributeName: string }> {
  const linkAttributePattern = /<(\w+)[^>]*\b(link-[a-zA-Z0-9_-]+)[^>]*>/g
  const matches: Array<{ tagName: string; attributeName: string }> = []
  let match: RegExpExecArray | null

  match = linkAttributePattern.exec(sourceCode)
  while (match !== null) {
    matches.push({
      tagName: match[1].toLowerCase(),
      attributeName: match[2],
    })
    match = linkAttributePattern.exec(sourceCode)
  }

  return matches
}

function validateNoForbiddenHtmlAttributes(
  sourceCode: string,
  filePath: string,
  errorFn: (message: string) => void,
): void {
  const linkMatches = extractLinkAttributeMatches(sourceCode)

  const invalidMatches = linkMatches.filter(
    (match) => !isRootPelelaOrComponent(match.tagName) && isStandardHtmlTag(match.tagName),
  )

  invalidMatches.forEach((match) => {
    errorFn(
      t('compiler.forbiddenRootAttribute', {
        filePath,
        tagName: match.tagName,
        attr: match.attributeName,
      }),
    )
  })
}

function validatePelelaStructure(
  sourceCode: string,
  filePath: string,
  errorFn: (message: string) => void,
): void {
  const openTags = sourceCode.match(/<(?:pelela|component)\b[^>]*>/g) || []
  const closeTags = sourceCode.match(/<\/(?:pelela|component)>/g) || []

  if (openTags.length === 0) {
    errorFn(t('compiler.missingRoot', { filePath }))
  }

  if (openTags.length > 1) {
    errorFn(t('compiler.multipleRoots', { filePath, count: openTags.length }))
  }

  if (closeTags.length === 0) {
    errorFn(t('compiler.missingClosingTag', { filePath }))
  }

  if (closeTags.length !== openTags.length) {
    errorFn(t('compiler.unbalancedTags', { filePath }))
  }
}

function validateNoForeignSyntax(
  sourceCode: string,
  filePath: string,
  errorFn: (message: string) => void,
): void {
  if (/\{\{.*?\}\}/.test(sourceCode)) {
    errorFn(t('compiler.foreignInterpolation', { filePath }))
  }

  if (/<[^>]+ \[[^\]]+\]\s*=.*/.test(sourceCode)) {
    errorFn(t('compiler.foreignPropertyBinding', { filePath }))
  }
}

function validateNoForbiddenRootAttributes(
  sourceCode: string,
  filePath: string,
  errorFn: (message: string) => void,
): void {
  const rootTagMatch = sourceCode.match(/<(pelela|component)\b([^>]*)>/i)
  if (!rootTagMatch) return

  const attributes = rootTagMatch[2]
  const forbiddenPatterns = [
    /\blink-[a-zA-Z0-9_-]+/,
    /\bbind-[a-zA-Z0-9_-]+/,
    /\bif\s*=/,
    /\bfor-each\s*=/,
    /\bclick\s*=/,
  ]

  const foundPattern = forbiddenPatterns.find((pattern) => pattern.test(attributes))

  if (foundPattern && ['pelela', 'component'].includes(rootTagMatch[1].toLowerCase())) {
    errorFn(
      t('compiler.forbiddenRootAttribute', {
        filePath,
        tagName: rootTagMatch[1],
        attr: attributes.match(foundPattern)?.[0],
      }),
    )
  }
}

function extractViewModelName(
  sourceCode: string,
  filePath: string,
  errorFn: (message: string) => void,
): string {
  const viewModelMatch = sourceCode.match(/<(?:pelela|component)[^>]*view-model\s*=\s*"([^"]+)"/)
  const viewModelName = viewModelMatch ? viewModelMatch[1] : null

  if (!viewModelName) {
    errorFn(t('compiler.missingViewModel', { filePath }))
    return ''
  }

  return viewModelName
}

function generateModuleCode(
  cssImport: string,
  viewModelName: string,
  escapedTemplate: string,
): string {
  return `
${cssImport}export const viewModelName = ${JSON.stringify(viewModelName)};
const template = \`${escapedTemplate}\`;
export default template;
`
}

export function pelelajsPlugin(): Plugin {
  initializeI18n()

  return {
    name: 'vite-plugin-pelelajs',
    enforce: 'pre',

    load(filePath) {
      if (!filePath.endsWith('.pelela')) {
        return null
      }

      const sourceCode = fs.readFileSync(filePath, 'utf-8')
      const cssImport = getCssImport(filePath)

      const errorHandler = this.error.bind(this)
      validatePelelaStructure(sourceCode, filePath, errorHandler)
      validateNoForbiddenRootAttributes(sourceCode, filePath, errorHandler)
      validateNoForbiddenHtmlAttributes(sourceCode, filePath, errorHandler)
      validateNoForeignSyntax(sourceCode, filePath, errorHandler)
      const viewModelName = extractViewModelName(sourceCode, filePath, errorHandler)

      const escapedTemplate = escapeTemplateForLiteral(sourceCode)

      return generateModuleCode(cssImport, viewModelName, escapedTemplate)
    },
  }
}
