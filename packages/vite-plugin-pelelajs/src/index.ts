import * as fs from 'node:fs'
import path from 'node:path'
import { initializeI18n } from 'pelelajs'

import type { Plugin } from 'vite'
import {
  componentTagToKebabCase,
  getPelelaFilePath,
  validatePelelaSource,
} from './templateValidation'

export { extractLinkAttributeMatches } from './templateValidation'

const PLUGIN_NAME = 'vite-plugin-pelelajs'

interface ComponentFileMetadata {
  name: string
  tsPath: string
  pelelaPath: string
  viewModelName: string
  cssPaths: string[]
}

export function escapeTemplateForLiteral(html: string): string {
  return html.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function getCssImport(pelelaFilePath: string): string {
  const cssFile = pelelaFilePath.replace(/\.pelela$/, '.css')
  if (fs.existsSync(cssFile)) {
    const cssBase = path.basename(cssFile)
    return `export const __pelelaCssUrls = [new URL("./${cssBase}", import.meta.url).href];\n`
  }
  return 'export const __pelelaCssUrls = [];\n'
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

function findComponentFiles(srcDir: string): ComponentFileMetadata[] {
  if (!fs.existsSync(srcDir)) return []

  return fs
    .readdirSync(srcDir)
    .filter((file) => file.endsWith('.ts'))
    .map((tsFile) => {
      const componentName = tsFile.replace(/\.ts$/, '')
      const pelelaFile = `${componentName}.pelela`
      const pelelaPath = path.join(srcDir, pelelaFile)
      const cssPath = path.join(srcDir, `${componentName}.css`)
      const cssPaths = fs.existsSync(cssPath) ? [`./${componentName}.css`] : []

      return {
        componentName,
        tsFile,
        pelelaFile,
        pelelaPath,
        cssPaths,
      }
    })
    .filter(({ pelelaPath }) => fs.existsSync(pelelaPath))
    .map(({ componentName, tsFile, pelelaFile, pelelaPath, cssPaths }) => {
      const templateContent = fs.readFileSync(pelelaPath, 'utf-8')
      const viewModelMatch = templateContent.match(
        /<(?:pelela|component)[^>]*view-model\s*=\s*"([^"]+)"/,
      )?.[1]
      const viewModelName = viewModelMatch || componentName

      return {
        name: componentName,
        tsPath: `./src/${tsFile}`,
        pelelaPath: `./src/${pelelaFile}`,
        viewModelName,
        cssPaths,
      }
    })
}

export function kebabToCamelCase(name: string): string {
  return name.replace(/[-.]([a-z])/g, (_, letter) => letter.toUpperCase())
}

function generateComponentMetadata(component: ComponentFileMetadata) {
  const { name, viewModelName, tsPath, pelelaPath, cssPaths } = component
  const baseName = kebabToCamelCase(name)
  const templateVar = `${baseName}Template`
  const cssUrlsVar = `${baseName}CssUrls`
  const hasCss = cssPaths.length > 0

  return {
    componentImport: `import { ${viewModelName} } from "${tsPath}";`,

    templateImport: `import ${templateVar}${
      hasCss ? `, { __pelelaCssUrls as ${cssUrlsVar} }` : ''
    } from "${pelelaPath}";`,

    registration: hasCss
      ? `defineComponent("${viewModelName}", ${viewModelName}, ${templateVar}, { cssUrls: ${cssUrlsVar} });`
      : `defineComponent("${viewModelName}", ${viewModelName}, ${templateVar});`,
  }
}

function generateAutoRegistrationCode(components: ComponentFileMetadata[]): string {
  const processedComponents = components.map(generateComponentMetadata)

  const componentImports = processedComponents
    .map((processed) => processed.componentImport)
    .join('\n')

  const templateImports = processedComponents
    .map((processed) => processed.templateImport)
    .join('\n')

  const registrations = processedComponents.map((processed) => processed.registration).join('\n')

  return `
${componentImports}
${templateImports}
import { defineComponent } from "pelelajs";

${registrations}
`
}

function getKnownComponentTags(pelelaFilePath: string): string[] {
  return findComponentFiles(path.dirname(pelelaFilePath)).map((component) =>
    componentTagToKebabCase(component.viewModelName),
  )
}

export function pelelajsPlugin(): Plugin {
  initializeI18n()

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',

    resolveId(id) {
      if (id === 'virtual:pelela-auto-register') {
        return '\0virtual:pelela-auto-register'
      }
      return null
    },

    load(filePath) {
      if (filePath === '\0virtual:pelela-auto-register') {
        const srcDir = path.join(process.cwd(), 'src')
        const components = findComponentFiles(srcDir)

        if (components.length === 0) {
          return 'export {}'
        }

        return generateAutoRegistrationCode(components)
      }

      const pelelaFilePath = getPelelaFilePath(filePath)
      if (!pelelaFilePath) {
        return null
      }

      const sourceCode = fs.readFileSync(pelelaFilePath, 'utf-8')
      const cssImport = getCssImport(pelelaFilePath)

      const viewModelName = validatePelelaSource({
        sourceCode,
        filePath: pelelaFilePath,
        knownComponentTags: getKnownComponentTags(pelelaFilePath),
        errorFn: this.error.bind(this),
      })

      const escapedTemplate = escapeTemplateForLiteral(sourceCode)

      return generateModuleCode(cssImport, viewModelName, escapedTemplate)
    },
  }
}
