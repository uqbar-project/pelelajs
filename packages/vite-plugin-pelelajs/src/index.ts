import * as fs from 'node:fs'
import path from 'node:path'
import {
  analyzeViewModelModule,
  classifyViewModelIssue,
  pascalCaseFromFileName,
  type ViewModelIssue,
} from '@pelelajs/view-model-analysis'
import type { ViewModelExportErrorParams } from 'pelelajs'
import { initializeI18n } from 'pelelajs'

import type { Plugin } from 'vite'
import {
  componentTagToKebabCase,
  getPelelaFilePath,
  validatePelelaSource,
} from './templateValidation'

export { extractLinkAttributeMatches } from './templateValidation'

const PLUGIN_NAME = 'vite-plugin-pelelajs'
const VIRTUAL_MODULE_ID = 'virtual:pelela-auto-register'
const RESOLVED_VIRTUAL_ID = '\0virtual:pelela-auto-register'
const COMPONENT_SOURCE_EXTENSIONS = new Set(['.ts', '.pelela', '.css'])

interface ComponentFileMetadata {
  name: string
  tsPath: string
  pelelaPath: string
  viewModelName: string
  cssPaths: string[]
  issue: ViewModelIssue
}

interface ProcessedComponent {
  componentImport: string | null
  templateImport: string
  registration: string
  hasExportIssue: boolean
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

function collectTsFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dir, entry.name)
      return entry.isDirectory() ? collectTsFiles(entryPath) : [entryPath]
    })
    .filter((filePath) => filePath.endsWith('.ts'))
}

function findComponentFiles(srcDir: string): ComponentFileMetadata[] {
  if (!fs.existsSync(srcDir)) return []

  const tsPaths = collectTsFiles(srcDir)

  return tsPaths
    .map((tsPath) => {
      const componentName = path.basename(tsPath).replace(/\.ts$/, '')
      const pelelaPath = tsPath.replace(/\.ts$/, '.pelela')
      if (!fs.existsSync(pelelaPath)) return null

      const cssPath = tsPath.replace(/\.ts$/, '.css')
      const cssPaths = fs.existsSync(cssPath) ? [`./${path.basename(cssPath)}`] : []

      const templateContent = fs.readFileSync(pelelaPath, 'utf-8')
      const viewModelMatch = templateContent.match(
        /<(?:pelela|component)[^>]*view-model\s*=\s*"([^"]+)"/,
      )?.[1]
      const viewModelName = viewModelMatch || componentName
      const tsSource = fs.readFileSync(tsPath, 'utf-8')
      const analysis = analyzeViewModelModule(tsSource)
      const issue = classifyViewModelIssue(
        analysis,
        viewModelName,
        pascalCaseFromFileName(componentName),
      )

      const toImportPath = (filePath: string): string =>
        `./${path.relative(process.cwd(), filePath).split(path.sep).join('/')}`

      return {
        name: componentName,
        tsPath: toImportPath(tsPath),
        pelelaPath: toImportPath(pelelaPath),
        viewModelName,
        cssPaths,
        issue,
      }
    })
    .filter((component): component is ComponentFileMetadata => component !== null)
}

export function kebabToCamelCase(name: string): string {
  return name.replace(/[-.]([a-z])/g, (_, letter) => letter.toUpperCase())
}

function toViewModelExportParams(
  issue: Exclude<ViewModelIssue, { kind: 'ok' }>,
  tsPath: string,
): ViewModelExportErrorParams {
  return { ...issue, tsFilePath: tsPath.replace(/^\.\//, '') }
}

function isComponentSourceFile(file: string): boolean {
  return COMPONENT_SOURCE_EXTENSIONS.has(path.extname(file))
}

function generateComponentMetadata(component: ComponentFileMetadata): ProcessedComponent {
  const { name, viewModelName, tsPath, pelelaPath, cssPaths, issue } = component
  const baseName = kebabToCamelCase(name)
  const templateVar = `${baseName}Template`
  const cssUrlsVar = `${baseName}CssUrls`
  const hasCss = cssPaths.length > 0
  const optionsSuffix = hasCss ? `, { cssUrls: ${cssUrlsVar} }` : ''

  const templateImport = `import ${templateVar}${
    hasCss ? `, { __pelelaCssUrls as ${cssUrlsVar} }` : ''
  } from "${pelelaPath}";`

  if (issue.kind !== 'ok') {
    const stubName = `${viewModelName}Stub`
    const errorParams = JSON.stringify(toViewModelExportParams(issue, tsPath))
    return {
      componentImport: null,
      templateImport,
      registration: `function ${stubName}() {
  throw new ViewModelExportError(${errorParams});
}

defineComponent("${viewModelName}", ${stubName}, ${templateVar}${optionsSuffix});`,
      hasExportIssue: true,
    }
  }

  return {
    componentImport: `import { ${viewModelName} } from "${tsPath}";`,
    templateImport,
    registration: `defineComponent("${viewModelName}", ${viewModelName}, ${templateVar}${optionsSuffix});`,
    hasExportIssue: false,
  }
}

function generateAutoRegistrationCode(components: ComponentFileMetadata[]): string {
  const processedComponents = components.map(generateComponentMetadata)
  const hasExportIssues = processedComponents.some((processed) => processed.hasExportIssue)

  const componentImports = processedComponents
    .filter((processed) => processed.componentImport !== null)
    .map((processed) => processed.componentImport)
    .join('\n')

  const templateImports = processedComponents
    .map((processed) => processed.templateImport)
    .join('\n')

  const defineComponentImport = hasExportIssues
    ? 'import { defineComponent, ViewModelExportError } from "pelelajs";'
    : 'import { defineComponent } from "pelelajs";'

  const registrations = processedComponents.map((processed) => processed.registration).join('\n')

  return `
${componentImports}
${templateImports}
${defineComponentImport}

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
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_ID
      }
      return null
    },

    load(filePath) {
      if (filePath === RESOLVED_VIRTUAL_ID) {
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

    hotUpdate({ file, modules }) {
      const srcDir = path.join(process.cwd(), 'src')
      if (!file.startsWith(`${srcDir}${path.sep}`)) {
        return undefined
      }
      if (!isComponentSourceFile(file)) {
        return undefined
      }
      const autoRegisterModule = this.environment.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
      if (!autoRegisterModule) {
        return undefined
      }
      if (modules.some((module) => module.id === RESOLVED_VIRTUAL_ID)) {
        return modules
      }
      return [...modules, autoRegisterModule]
    },
  }
}
