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

  if (foundPattern && rootTagMatch[1].toLowerCase() === 'pelela') {
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
      validateNoForeignSyntax(sourceCode, filePath, errorHandler)
      const viewModelName = extractViewModelName(sourceCode, filePath, errorHandler)

      const escapedTemplate = escapeTemplateForLiteral(sourceCode)

      return generateModuleCode(cssImport, viewModelName, escapedTemplate)
    },
  }
}
