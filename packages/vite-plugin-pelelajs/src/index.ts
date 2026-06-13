import * as fs from 'node:fs'
import path from 'node:path'
import {
  initializeI18n,
  isPelelaRootTag,
  isStandardHtmlTag,
  isValidComponentAttribute,
  LINK_PREFIX,
  t,
} from 'pelelajs'

import type { Plugin } from 'vite'

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

const TAG_PATTERN = /<([\w-]+)([^>]*)>/g
const LINK_ATTRIBUTE_PATTERN = new RegExp(`\\b(${LINK_PREFIX}[a-zA-Z0-9_-]+)\\s*=`, 'g')

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

const ATTRIBUTE_PAIR_PATTERN = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?/g

function extractAttributeNames(attributesSegment: string): string[] {
  return Array.from(attributesSegment.matchAll(ATTRIBUTE_PAIR_PATTERN), (match) => match[1])
}

function extractComponentAttributeMatches(
  sourceCode: string,
): Array<{ tagName: string; attributeName: string }> {
  return Array.from(sourceCode.matchAll(TAG_PATTERN)).flatMap((tagMatch) =>
    extractAttributeNames(tagMatch[2]).map((attributeName) => ({
      tagName: tagMatch[1].toLowerCase(),
      attributeName,
    })),
  )
}

function validateComponentAttributes(sourceCode: string, errorFn: (message: string) => void): void {
  const componentMatches = extractComponentAttributeMatches(sourceCode)

  const invalidMatches = componentMatches.filter(
    (match) =>
      !isPelelaRootTag(match.tagName) &&
      !isStandardHtmlTag(match.tagName) &&
      !isValidComponentAttribute(match.attributeName),
  )

  invalidMatches.forEach((match) => {
    errorFn(
      t('errors.compiler.invalidComponentAttribute', {
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
    (match) => !isPelelaRootTag(match.tagName) && isStandardHtmlTag(match.tagName),
  )

  invalidMatches.forEach((match) => {
    errorFn(
      t('errors.compiler.forbiddenRootAttribute', {
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
  const openTags = sourceCode.match(/<(?:pelela|component)\b[^>]*>/gi) || []
  const closeTags = sourceCode.match(/<\/(?:pelela|component)>/gi) || []

  if (openTags.length === 0) {
    errorFn(t('errors.compiler.missingRoot', { filePath }))
  }

  if (openTags.length > 1) {
    errorFn(t('errors.compiler.multipleRoots', { filePath, count: openTags.length }))
  }

  if (closeTags.length === 0) {
    errorFn(t('errors.compiler.missingClosingTag', { filePath }))
  }

  if (closeTags.length !== openTags.length) {
    errorFn(t('errors.compiler.unbalancedTags', { filePath }))
  }
}

function validateNoForeignSyntax(
  sourceCode: string,
  filePath: string,
  errorFn: (message: string) => void,
): void {
  if (/\{\{.*?\}\}/.test(sourceCode)) {
    errorFn(t('errors.compiler.foreignInterpolation', { filePath }))
  }

  if (/<[^>]+ \[[^\]]+\]\s*=.*/.test(sourceCode)) {
    errorFn(t('errors.compiler.foreignPropertyBinding', { filePath }))
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
      t('errors.compiler.forbiddenRootAttribute', {
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
  const viewModelMatch = sourceCode.match(/<(?:pelela|component)[^>]*view-model\s*=\s*"([^"]+)"/i)
  const viewModelName = viewModelMatch ? viewModelMatch[1] : null

  if (!viewModelName) {
    errorFn(t('errors.compiler.missingViewModel', { filePath }))
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

function findComponentFiles(srcDir: string): Array<{
  name: string
  tsPath: string
  pelelaPath: string
  viewModelName: string
  cssPaths: string[]
}> {
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

function generateAutoRegistrationCode(
  components: Array<{
    name: string
    tsPath: string
    pelelaPath: string
    viewModelName: string
    cssPaths: string[]
  }>,
): string {
  const componentImports = components
    .map(({ tsPath, viewModelName }) => `import { ${viewModelName} } from "${tsPath}";`)
    .join('\n')

  const templateImports = components
    .map(({ name, pelelaPath, cssPaths }) => {
      const templateVar = `${kebabToCamelCase(name)}Template`
      if (cssPaths.length > 0) {
        const cssUrlsVar = `${kebabToCamelCase(name)}CssUrls`
        return `import ${templateVar}, { __pelelaCssUrls as ${cssUrlsVar} } from "${pelelaPath}";`
      }
      return `import ${templateVar} from "${pelelaPath}";`
    })
    .join('\n')

  const registrations = components
    .map(({ viewModelName, name, cssPaths }) => {
      const templateVar = `${kebabToCamelCase(name)}Template`
      if (cssPaths.length > 0) {
        const cssUrlsVar = `${kebabToCamelCase(name)}CssUrls`
        return `defineComponent("${viewModelName}", ${viewModelName}, ${templateVar}, { cssUrls: ${cssUrlsVar} });`
      }
      return `defineComponent("${viewModelName}", ${viewModelName}, ${templateVar})`
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
