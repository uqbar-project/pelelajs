import * as fs from 'node:fs'
import path from 'node:path'
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
  const openTags = sourceCode.match(/<pelela\b[^>]*>/g) || []
  const closeTags = sourceCode.match(/<\/pelela>/g) || []

  if (openTags.length === 0) {
    errorFn(`Pelela template "${filePath}" debe contener exactamente un <pelela ...> como raíz.`)
  }

  if (openTags.length > 1) {
    errorFn(
      `Pelela template "${filePath}" tiene ${openTags.length} etiquetas <pelela>. Solo se permite una raíz.`,
    )
  }

  if (closeTags.length === 0) {
    errorFn(`Pelela template "${filePath}" no tiene etiqueta de cierre </pelela>.`)
  }

  if (closeTags.length !== openTags.length) {
    errorFn(`Pelela template "${filePath}" tiene un número desbalanceado de <pelela> y </pelela>.`)
  }
}

function extractViewModelName(
  sourceCode: string,
  filePath: string,
  errorFn: (message: string) => void,
): string {
  const viewModelMatch = sourceCode.match(/<pelela[^>]*view-model\s*=\s*"([^"]+)"/)
  const viewModelName = viewModelMatch ? viewModelMatch[1] : null

  if (!viewModelName) {
    errorFn(`Pelela template "${filePath}" debe contener <pelela view-model="...">`)
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
      const viewModelName = extractViewModelName(sourceCode, filePath, errorHandler)

      const escapedTemplate = escapeTemplateForLiteral(sourceCode)

      return generateModuleCode(cssImport, viewModelName, escapedTemplate)
    },
  }
}
