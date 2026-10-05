import * as fs from 'node:fs'
import path from 'node:path'
import type { ViewModelExportErrorParams } from 'pelelajs'
import { initializeI18n } from 'pelelajs'
import {
  analyzeViewModelModule,
  type ConstKind,
  type ConstTypeInfo,
  classifyViewModelIssue,
  createViewModelProgramContextFromProgram,
  extractViewModelPropertyTypes,
  extractViewModelPropertyTypesWithContext,
  resolveCompilerOptions,
  suggestViewModelClassName,
  type ViewModelIssue,
  type ViewModelPropertyTypes,
} from 'pelelajs/analysis'
import * as ts from 'typescript'

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
  typeMap: ViewModelPropertyTypes | null
  issue: ViewModelIssue
}

interface FindComponentFilesOptions {
  includeTypeMap?: boolean
  extractPropertyTypes?: (
    componentTsPaths: string[],
    tsPath: string,
    className: string,
  ) => ViewModelPropertyTypes
}

interface TypeMapProgramCache {
  setRootFiles(tsPaths: string[]): void
  extractPropertyTypes(tsPath: string, className: string): ViewModelPropertyTypes
  invalidate(tsPath: string): void
  dispose(): void
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

function createTypeMapProgramCache(currentDirectory: string): TypeMapProgramCache {
  const compilerOptions = resolveCompilerOptions(currentDirectory)
  const rootFiles = new Set<string>()
  const fileVersions = new Map<string, { modificationTime: number; version: string }>()
  let nextVersion = 0

  const scriptVersionOf = (fileName: string): string => {
    const cached = fileVersions.get(fileName)
    let modificationTime = 0
    try {
      modificationTime = fs.statSync(fileName).mtimeMs
    } catch {
      fileVersions.delete(fileName)
      return '0'
    }

    if (cached !== undefined && cached.modificationTime === modificationTime) {
      return cached.version
    }

    const version = `${modificationTime}-${++nextVersion}`
    fileVersions.set(fileName, { modificationTime, version })
    return version
  }

  const languageService = ts.createLanguageService(
    {
      getCompilationSettings: () => compilerOptions,
      getScriptFileNames: () => Array.from(rootFiles),
      getScriptVersion: scriptVersionOf,
      getScriptSnapshot: (fileName) => {
        const content = ts.sys.readFile(fileName)
        return content === undefined ? undefined : ts.ScriptSnapshot.fromString(content)
      },
      getCurrentDirectory: () => currentDirectory,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    },
    ts.createDocumentRegistry(),
  )

  return {
    setRootFiles(tsPaths) {
      const resolvedTsPaths = tsPaths.map((tsPath) => path.resolve(tsPath))
      const hasSameRootFiles =
        rootFiles.size === resolvedTsPaths.length &&
        resolvedTsPaths.every((tsPath) => rootFiles.has(tsPath))
      if (hasSameRootFiles) return

      rootFiles.clear()
      resolvedTsPaths.forEach((tsPath) => {
        rootFiles.add(tsPath)
      })
    },
    extractPropertyTypes(tsPath, className) {
      const resolvedTsPath = path.resolve(tsPath)
      const program = languageService.getProgram()
      if (program === undefined) {
        throw new Error(`Pelela could not build a TypeScript program for ${resolvedTsPath}`)
      }

      const context = createViewModelProgramContextFromProgram(program, resolvedTsPath)
      return extractViewModelPropertyTypesWithContext(context, className)
    },
    invalidate(tsPath) {
      fileVersions.delete(path.resolve(tsPath))
    },
    dispose() {
      languageService.dispose()
      rootFiles.clear()
      fileVersions.clear()
    },
  }
}

function findComponentFiles(
  srcDir: string,
  { includeTypeMap = true, extractPropertyTypes }: FindComponentFilesOptions = {},
): ComponentFileMetadata[] {
  if (!fs.existsSync(srcDir)) return []

  const tsPaths = collectTsFiles(srcDir)
  const componentTsPaths = tsPaths.filter((tsPath) =>
    fs.existsSync(tsPath.replace(/\.ts$/, '.pelela')),
  )

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
        suggestViewModelClassName(analysis),
      )

      const toImportPath = (filePath: string): string =>
        `./${path.relative(process.cwd(), filePath).split(path.sep).join('/')}`

      return {
        name: componentName,
        tsPath: toImportPath(tsPath),
        pelelaPath: toImportPath(pelelaPath),
        viewModelName,
        cssPaths,
        typeMap: includeTypeMap
          ? extractPropertyTypes === undefined
            ? extractViewModelPropertyTypes(tsPath, viewModelName)
            : extractPropertyTypes(componentTsPaths, tsPath, viewModelName)
          : null,
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

function isRuntimeConvertible(value: ConstKind | ConstTypeInfo): boolean {
  if (typeof value === 'string') return value !== 'unknown' && value !== 'other'
  if (value.kind === 'other') return false
  if (value.kind === 'unknown') return value.allowedKinds !== undefined
  return true
}

function generateComponentMetadata(component: ComponentFileMetadata): ProcessedComponent {
  const { name, viewModelName, tsPath, pelelaPath, cssPaths, typeMap, issue } = component
  const baseName = kebabToCamelCase(name)
  const templateVar = `${baseName}Template`
  const cssUrlsVar = `${baseName}CssUrls`
  const hasCss = cssPaths.length > 0
  const typeMapEntries = Object.entries(typeMap ?? {}).filter(([, descriptor]) =>
    isRuntimeConvertible(descriptor),
  )
  const optionsParts: string[] = []
  if (typeMapEntries.length > 0) {
    optionsParts.push(`typeMap: ${JSON.stringify(Object.fromEntries(typeMapEntries))}`)
  }
  if (hasCss) {
    optionsParts.push(`cssUrls: ${cssUrlsVar}`)
  }
  const optionsSuffix = optionsParts.length > 0 ? `, { ${optionsParts.join(', ')} }` : ''
  const cssSuffix = hasCss ? `, { cssUrls: ${cssUrlsVar} }` : ''

  const templateImport = `import ${templateVar}${
    hasCss ? `, { __pelelaCssUrls as ${cssUrlsVar} }` : ''
  } from "${pelelaPath}";`

  if (issue.kind !== 'ok') {
    const stubName = `${viewModelName}Stub`
    const errorParams = JSON.stringify(toViewModelExportParams(issue, tsPath))
    return {
      componentImport: null,
      templateImport,
      registration: `class ${stubName} {
  constructor() {
    throw new ViewModelExportError(${errorParams});
  }
}

defineComponent("${viewModelName}", ${stubName}, ${templateVar}${cssSuffix});`,
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

function getKnownComponentTags(): string[] {
  const srcDir = path.join(process.cwd(), 'src')
  return findComponentFiles(srcDir, { includeTypeMap: false }).map((component) =>
    componentTagToKebabCase(component.viewModelName),
  )
}

export function pelelajsPlugin(): Plugin {
  initializeI18n()
  const typeMapProgramCaches = new Map<string, TypeMapProgramCache>()

  const extractPropertyTypes = (
    componentTsPaths: string[],
    tsPath: string,
    className: string,
  ): ViewModelPropertyTypes => {
    const configPath = ts.findConfigFile(path.dirname(tsPath), ts.sys.fileExists)
    const currentDirectory = configPath === undefined ? process.cwd() : path.dirname(configPath)
    const cacheKey = configPath ?? path.resolve(currentDirectory)
    let programCache = typeMapProgramCaches.get(cacheKey)
    if (programCache === undefined) {
      programCache = createTypeMapProgramCache(currentDirectory)
      typeMapProgramCaches.set(cacheKey, programCache)
    }
    const cacheKeyFor = (filePath: string): string =>
      ts.findConfigFile(path.dirname(filePath), ts.sys.fileExists) ?? path.resolve(process.cwd())
    const projectTsPaths = componentTsPaths.filter(
      (componentTsPath) => cacheKeyFor(componentTsPath) === cacheKey,
    )
    programCache.setRootFiles(projectTsPaths)
    return programCache.extractPropertyTypes(tsPath, className)
  }

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
        const components = findComponentFiles(srcDir, { extractPropertyTypes })

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
        knownComponentTags: getKnownComponentTags(),
        errorFn: this.error.bind(this),
      })

      const escapedTemplate = escapeTemplateForLiteral(sourceCode)

      return generateModuleCode(cssImport, viewModelName, escapedTemplate)
    },

    hotUpdate({ file, modules }) {
      if (path.extname(file) === '.ts' || path.extname(file) === '.tsx') {
        typeMapProgramCaches.forEach((programCache) => {
          programCache.invalidate(file)
        })
      }

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

    closeBundle() {
      typeMapProgramCaches.forEach((programCache) => {
        programCache.dispose()
      })
      typeMapProgramCaches.clear()
    },
  }
}
