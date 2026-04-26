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
    errorFn(`Pelela template "${filePath}" must contain exactly one <pelela ...> as root.`)
  }

  if (openTags.length > 1) {
    errorFn(
      `Pelela template "${filePath}" has ${openTags.length} <pelela> tags. Only one root is allowed.`,
    )
  }

  if (closeTags.length === 0) {
    errorFn(`Pelela template "${filePath}" is missing closing tag </pelela>.`)
  }

  if (closeTags.length !== openTags.length) {
    errorFn(`Pelela template "${filePath}" has unbalanced <pelela> and </pelela> tags.`)
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
    errorFn(`Pelela template "${filePath}" must contain <pelela view-model="...">`)
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

function findComponentFiles(
  srcDir: string,
): Array<{ name: string; tsPath: string; pelelaPath: string; viewModelName: string }> {
  if (!fs.existsSync(srcDir)) return []

  return fs
    .readdirSync(srcDir)
    .filter((file) => file.endsWith('.ts'))
    .map((tsFile) => {
      const componentName = tsFile.replace(/\.ts$/, '')
      const pelelaFile = `${componentName}.pelela`
      const pelelaPath = path.join(srcDir, pelelaFile)

      return {
        componentName,
        tsFile,
        pelelaFile,
        pelelaPath,
      }
    })
    .filter(({ pelelaPath }) => fs.existsSync(pelelaPath))
    .map(({ componentName, tsFile, pelelaFile, pelelaPath }) => {
      const templateContent = fs.readFileSync(pelelaPath, 'utf-8')
      const viewModelMatch = templateContent.match(/<pelela[^>]*view-model\s*=\s*"([^"]+)"/)?.[1]
      const viewModelName = viewModelMatch || componentName

      return {
        name: componentName,
        tsPath: `./src/${tsFile}`,
        pelelaPath: `./src/${pelelaFile}`,
        viewModelName,
      }
    })
}

function kebabToCamelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

function generateAutoRegistrationCode(
  components: Array<{ name: string; tsPath: string; pelelaPath: string; viewModelName: string }>,
): string {
  const componentImports = components
    .map(({ tsPath, viewModelName }) => `import { ${viewModelName} } from "${tsPath}";`)
    .join('\n')

  const templateImports = components
    .map(({ name, pelelaPath }) => {
      const templateVar = `${kebabToCamelCase(name)}Template`
      return `import ${templateVar} from "${pelelaPath}";`
    })
    .join('\n')

  const registrations = components
    .map(({ viewModelName, name }) => {
      const templateVar = `${kebabToCamelCase(name)}Template`
      return `defineComponent("${viewModelName}", ${viewModelName}, ${templateVar});`
    })
    .join('\n')

  return `
${componentImports}
${templateImports}
import { defineComponent } from "pelelajs";

${registrations}
`
}

export function pelelajsPlugin(): Plugin {
  return {
    name: 'vite-plugin-pelelajs',
    enforce: 'pre',

    resolveId(id) {
      if (id === 'virtual:pelela-auto-register') {
        return '\0virtual:pelela-auto-register'
      }
      return null
    },

    load(id) {
      if (id === '\0virtual:pelela-auto-register') {
        const srcDir = path.join(process.cwd(), 'src')
        const components = findComponentFiles(srcDir)

        if (components.length === 0) {
          return 'export {}'
        }

        return generateAutoRegistrationCode(components)
      }

      if (!id.endsWith('.pelela')) {
        return null
      }

      const sourceCode = fs.readFileSync(id, 'utf-8')
      const cssImport = getCssImport(id)

      const errorHandler = this.error.bind(this)
      validatePelelaStructure(sourceCode, id, errorHandler)
      const viewModelName = extractViewModelName(sourceCode, id, errorHandler)

      const escapedTemplate = escapeTemplateForLiteral(sourceCode)

      return generateModuleCode(cssImport, viewModelName, escapedTemplate)
    },
  }
}
