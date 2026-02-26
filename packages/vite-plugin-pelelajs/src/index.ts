import * as fs from 'node:fs'
import path from 'node:path'

type PelelaFileType = 'page' | 'component'

function expandSelfClosingComponents(html: string): string {
  return html.replace(/<([A-Z][a-zA-Z0-9]*)\b([^>]*?)\/>/gs, '<$1$2></$1>')
}

function escapeTemplate(html: string): string {
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

function detectFileType(code: string): PelelaFileType {
  const hasComponent = /<component\b[^>]*>/i.test(code)
  const hasPelela = /<pelela\b[^>]*>/i.test(code)

  if (hasComponent && hasPelela) {
    return 'component'
  }
  if (hasComponent) {
    return 'component'
  }
  return 'page'
}

function validatePelelaStructure(
  code: string,
  id: string,
  fileType: PelelaFileType,
  errorFn: (msg: string) => void,
): void {
  const tagName = fileType === 'component' ? 'component' : 'pelela'
  const openTagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'g')
  const closeTagPattern = new RegExp(`</${tagName}>`, 'g')

  const openTags = code.match(openTagPattern) || []
  const closeTags = code.match(closeTagPattern) || []

  if (openTags.length === 0) {
    errorFn(`Pelela ${fileType} "${id}" debe contener exactamente un <${tagName} ...> como raíz.`)
  }

  if (openTags.length > 1) {
    errorFn(
      `Pelela ${fileType} "${id}" tiene ${openTags.length} etiquetas <${tagName}>. Solo se permite una raíz.`,
    )
  }

  if (closeTags.length === 0) {
    errorFn(`Pelela ${fileType} "${id}" no tiene etiqueta de cierre </${tagName}>.`)
  }

  if (closeTags.length !== openTags.length) {
    errorFn(
      `Pelela ${fileType} "${id}" tiene un número desbalanceado de <${tagName}> y </${tagName}>.`,
    )
  }
}

function extractViewModelName(
  code: string,
  id: string,
  fileType: PelelaFileType,
  errorFn: (msg: string) => void,
): string {
  const tagName = fileType === 'component' ? 'component' : 'pelela'
  const viewModelPattern = new RegExp(`<${tagName}[^>]*view-model\\s*=\\s*"([^"]+)"`)
  const viewModelMatch = code.match(viewModelPattern)
  const viewModelName = viewModelMatch ? viewModelMatch[1] : null

  if (!viewModelName) {
    errorFn(`Pelela ${fileType} "${id}" debe contener <${tagName} view-model="...">`)
  }

  return viewModelName as string
}

export interface PelelaVitePlugin {
  name: string
  enforce?: 'pre' | 'post'
  configResolved?(config: any): void
  resolveId?(id: string): string | null
  load?(this: any, id: string): string | null | Promise<string | null>
}

type ComponentInfo = {
  componentName: string
  filePath: string
  viewModelPath: string
}

function generatePageCode(
  viewModelName: string,
  template: string,
  cssImport: string,
): string {
  return `
${cssImport}export const viewModelName = ${JSON.stringify(viewModelName)};
const template = \`${template}\`;
export default template;
`
}

function generateComponentCode(
  viewModelName: string,
  template: string,
  cssImport: string,
  componentName: string,
): string {
  return `
${cssImport}export const viewModelName = ${JSON.stringify(viewModelName)};
export const componentName = ${JSON.stringify(componentName)};
export const isComponent = true;
const template = \`${template}\`;
export default template;
`
}

function getComponentNameFromPath(filePath: string): string {
  const basename = path.basename(filePath, '.pelela')
  return basename
}

function scanComponentsInDirectory(dir: string): ComponentInfo[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  const components: ComponentInfo[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      components.push(...scanComponentsInDirectory(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.pelela')) {
      const code = fs.readFileSync(fullPath, 'utf-8')
      const fileType = detectFileType(code)

      if (fileType === 'component') {
        const componentName = getComponentNameFromPath(fullPath)
        const viewModelPath = fullPath.replace(/\.pelela$/, '.ts')

        components.push({
          componentName,
          filePath: fullPath,
          viewModelPath,
        })
      }
    }
  }

  return components
}

function generateComponentRegistryCode(components: ComponentInfo[]): string {
  if (components.length === 0) {
    return `
export function registerAllComponents() {}
`
  }

  const imports = components
    .map((comp, index) => {
      return `import template${index} from '${comp.filePath}';
import { ${comp.componentName} as ViewModel${index} } from '${comp.viewModelPath}';`
    })
    .join('\n')

  const registrations = components
    .map((comp, index) => {
      return `  defineComponent('${comp.componentName}', {
    viewModelName: '${comp.componentName}',
    viewModelConstructor: ViewModel${index},
    template: template${index},
  });`
    })
    .join('\n')

  return `
import { defineComponent } from 'pelelajs';

${imports}

export function registerAllComponents() {
${registrations}
}
`
}

const VIRTUAL_COMPONENT_MODULE = 'pelela:components'
const RESOLVED_VIRTUAL_MODULE = '\0' + VIRTUAL_COMPONENT_MODULE

export function pelelajsPlugin(): PelelaVitePlugin {
  let projectRoot = ''
  let componentRegistryCode = ''

  return {
    name: 'vite-plugin-pelelajs',
    enforce: 'pre',

    configResolved(config) {
      projectRoot = config.root || process.cwd()

      const componentDirs = [
        path.join(projectRoot, 'lib'),
        path.join(projectRoot, 'components'),
        path.join(projectRoot, 'src', 'lib'),
        path.join(projectRoot, 'src', 'components'),
      ]

      let allComponents: ComponentInfo[] = []
      for (const dir of componentDirs) {
        const components = scanComponentsInDirectory(dir)
        allComponents = allComponents.concat(components)
      }

      componentRegistryCode = generateComponentRegistryCode(allComponents)

    },

    resolveId(id) {
      if (id === VIRTUAL_COMPONENT_MODULE) {
        return RESOLVED_VIRTUAL_MODULE
      }
      return null
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE) {
        return componentRegistryCode
      }

      if (!id.endsWith('.pelela')) return null

      const code = fs.readFileSync(id, 'utf-8')
      const fileType = detectFileType(code)
      const cssImport = getCssImport(id)

      validatePelelaStructure(code, id, fileType, this.error.bind(this))
      const viewModelName = extractViewModelName(code, id, fileType, this.error.bind(this))

      const expanded = expandSelfClosingComponents(code)
      const escaped = escapeTemplate(expanded)

      if (fileType === 'component') {
        const componentName = getComponentNameFromPath(id)
        return generateComponentCode(viewModelName, escaped, cssImport, componentName)
      }

      return generatePageCode(viewModelName, escaped, cssImport)
    },
  }
}
