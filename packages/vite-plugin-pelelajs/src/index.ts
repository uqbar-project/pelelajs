import * as fs from 'node:fs'
import path from 'node:path'
import { initializeI18n, t } from 'pelelajs'
import type { Plugin } from 'vite'

export function escapeTemplateForLiteral(html: string): string {
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

// biome-ignore format: <line length exceeds 100 due to comprehensive HTML tags list>
const STANDARD_HTML_TAGS = [
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
  'fieldset', 'legend', 'optgroup', 'datalist',
] as const

function isStandardHtmlTag(tagName: string): boolean {
  return STANDARD_HTML_TAGS.includes(tagName.toLowerCase() as (typeof STANDARD_HTML_TAGS)[number])
}

export function isRootPelelaOrComponent(tagName: string): boolean {
  return ['pelela', 'component'].includes(tagName.toLowerCase())
}

export const LINK_PREFIX = 'link-'
export const PROP_PREFIX = 'prop-'

const TAG_PATTERN = /<([\w-]+)([^>]*)>/g
const LINK_ATTRIBUTE_PATTERN = new RegExp(`\\b(${LINK_PREFIX}[a-zA-Z0-9_-]+)\\s*=`, 'g')
const COMPONENT_ATTRIBUTE_PATTERN = /([a-zA-Z0-9_-]+)\s*=/g

function extractAttributes(
  sourceCode: string,
  attrPattern: RegExp,
): Array<{ tagName: string; attributeName: string }> {
  return Array.from(sourceCode.matchAll(TAG_PATTERN)).flatMap((tagMatch) => {
    const tagName = tagMatch[1].toLowerCase()
    const attributesSegment = tagMatch[2]
    return Array.from(attributesSegment.matchAll(attrPattern), (attrMatch) => ({
      tagName,
      attributeName: attrMatch[1],
    }))
  })
}

export function extractLinkAttributeMatches(
  sourceCode: string,
): Array<{ tagName: string; attributeName: string }> {
  return extractAttributes(sourceCode, LINK_ATTRIBUTE_PATTERN)
}

function extractComponentAttributeMatches(
  sourceCode: string,
): Array<{ tagName: string; attributeName: string }> {
  return extractAttributes(sourceCode, COMPONENT_ATTRIBUTE_PATTERN)
}

function validateComponentAttributes(sourceCode: string, errorFn: (message: string) => void): void {
  const componentMatches = extractComponentAttributeMatches(sourceCode)

  const invalidMatches = componentMatches.filter(
    (match) =>
      !isRootPelelaOrComponent(match.tagName) &&
      !isStandardHtmlTag(match.tagName) &&
      !match.attributeName.startsWith(LINK_PREFIX) &&
      !match.attributeName.startsWith(PROP_PREFIX),
  )

  invalidMatches.forEach((match) => {
    errorFn(
      t('compiler.invalidComponentAttribute', {
        tag: match.tagName,
        attr: match.attributeName,
      }),
    )
  })
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
    new RegExp(`\\b${LINK_PREFIX}[a-zA-Z0-9_-]+`),
    /\bbind-[a-zA-Z0-9_-]+/,
    /\bif\s*=/,
    /\bfor-each\s*=/,
    /\bclick\s*=/,
  ]

  const foundPattern = forbiddenPatterns.find((pattern) => pattern.test(attributes))

  if (foundPattern) {
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
      const viewModelMatch = templateContent.match(
        /<(?:pelela|component)[^>]*view-model\s*=\s*"([^"]+)"/,
      )?.[1]
      const viewModelName = viewModelMatch || componentName

      return {
        name: componentName,
        tsPath: `./src/${tsFile}`,
        pelelaPath: `./src/${pelelaFile}`,
        viewModelName,
      }
    })
}

export function kebabToCamelCase(name: string): string {
  return name.replace(/[-.]([a-z])/g, (_, letter) => letter.toUpperCase())
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
  initializeI18n()

  return {
    name: 'vite-plugin-pelelajs',
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

      if (!filePath.endsWith('.pelela')) {
        return null
      }

      const sourceCode = fs.readFileSync(filePath, 'utf-8')
      const cssImport = getCssImport(filePath)

      const errorHandler = this.error.bind(this)
      validatePelelaStructure(sourceCode, filePath, errorHandler)
      validateNoForbiddenRootAttributes(sourceCode, filePath, errorHandler)
      validateNoForbiddenHtmlAttributes(sourceCode, filePath, errorHandler)
      validateComponentAttributes(sourceCode, errorHandler)
      validateNoForeignSyntax(sourceCode, filePath, errorHandler)
      const viewModelName = extractViewModelName(sourceCode, filePath, errorHandler)

      const escapedTemplate = escapeTemplateForLiteral(sourceCode)

      return generateModuleCode(cssImport, viewModelName, escapedTemplate)
    },
  }
}
