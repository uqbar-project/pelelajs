import {
  isPelelaRootTag,
  isStandardHtmlTag,
  isValidComponentAttribute,
  LINK_PREFIX,
  t,
} from 'pelelajs'

interface ValidatePelelaSourceParams {
  sourceCode: string
  filePath: string
  knownComponentTags: string[]
  errorFn: (message: string) => void
}

const TAG_PATTERN = /<([\w-]+)([^>]*)>/g
const LINK_ATTRIBUTE_PATTERN = new RegExp(`\\b(${LINK_PREFIX}[a-zA-Z0-9_-]+)\\s*=`, 'g')

export function getPelelaFilePath(filePath: string): string | null {
  const [cleanFilePath] = filePath.split(/[?#]/)
  return cleanFilePath.endsWith('.pelela') ? cleanFilePath : null
}

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

export function componentTagToKebabCase(tagName: string): string {
  return tagName
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

function validateComponentTagCase(sourceCode: string, errorFn: (message: string) => void): void {
  Array.from(sourceCode.matchAll(TAG_PATTERN))
    .map((tagMatch) => tagMatch[1])
    .filter((tagName) => {
      const normalizedTagName = tagName.toLowerCase()
      return (
        tagName !== normalizedTagName &&
        !isPelelaRootTag(normalizedTagName) &&
        !isStandardHtmlTag(normalizedTagName)
      )
    })
    .forEach((tagName) => {
      errorFn(
        t('errors.compiler.invalidComponentTagCase', {
          tag: tagName,
          suggestedTag: componentTagToKebabCase(tagName),
        }),
      )
    })
}

function extractTemplateTagNames(sourceCode: string): string[] {
  return Array.from(sourceCode.matchAll(TAG_PATTERN), (tagMatch) => tagMatch[1])
}

function findCollapsedKebabCaseTag(
  tagName: string,
  knownComponentTags: string[],
): string | undefined {
  return knownComponentTags.find((knownTag) => knownTag.replace(/-/g, '') === tagName)
}

function validateCollapsedComponentTags(
  sourceCode: string,
  knownComponentTags: string[],
  errorFn: (message: string) => void,
): void {
  extractTemplateTagNames(sourceCode)
    .filter((tagName) => {
      const normalizedTagName = tagName.toLowerCase()
      return (
        tagName === normalizedTagName &&
        !tagName.includes('-') &&
        !isPelelaRootTag(tagName) &&
        !isStandardHtmlTag(tagName)
      )
    })
    .map((tagName) => ({
      tagName,
      suggestedTag: findCollapsedKebabCaseTag(tagName, knownComponentTags),
    }))
    .filter(
      (match): match is { tagName: string; suggestedTag: string } =>
        match.suggestedTag !== undefined && match.suggestedTag !== match.tagName,
    )
    .forEach((match) => {
      errorFn(
        t('errors.compiler.invalidComponentTagCase', {
          tag: match.tagName,
          suggestedTag: match.suggestedTag,
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
        snippet: `<${match.tagName} ${match.attributeName}="...">`,
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

const IMG_ONLY_BINDINGS = ['bind-src', 'bind-alt'] as const
const INPUT_ONLY_EVENTS = ['enter'] as const

function validateBindingElementRestrictions(
  sourceCode: string,
  errorFn: (message: string) => void,
): void {
  for (const binding of IMG_ONLY_BINDINGS) {
    const pattern = new RegExp(
      `<([a-zA-Z][a-zA-Z0-9]*)\\s[^>]*(?<![a-zA-Z0-9_-])${binding}\\s*=`,
      'gi',
    )
    const matches = sourceCode.matchAll(pattern)
    for (const match of matches) {
      const tagName = match[1].toLowerCase()
      if (tagName !== 'img') {
        errorFn(t('errors.compiler.onlyForImg', { binding, tag: tagName }))
      }
    }
  }
}

function validateInputOnlyEvents(sourceCode: string, errorFn: (message: string) => void): void {
  for (const eventName of INPUT_ONLY_EVENTS) {
    const pattern = new RegExp(
      `<([a-zA-Z][a-zA-Z0-9]*)\\s[^>]*(?<![a-zA-Z0-9_-])${eventName}\\s*=`,
      'gi',
    )
    const matches = sourceCode.matchAll(pattern)
    for (const match of matches) {
      const tagName = match[1].toLowerCase()
      if (tagName !== 'input') {
        errorFn(t('errors.compiler.enterOnlyForInput', { tag: tagName }))
      }
    }
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
    /\benter\s*=/,
  ]

  const foundPattern = forbiddenPatterns.find((pattern) => pattern.test(attributes))
  const foundAttribute = attributes.match(foundPattern ?? '')?.[0]

  if (foundPattern) {
    errorFn(
      t('errors.compiler.forbiddenRootAttribute', {
        filePath,
        tagName: rootTagMatch[1],
        attr: foundAttribute,
        snippet: `<${rootTagMatch[1]} ${foundAttribute}="...">`,
      }),
    )
  }
}

function extractViewModelName(
  sourceCode: string,
  filePath: string,
  errorFn: (message: string) => void,
): string {
  const viewModelMatch = sourceCode.match(
    /<(?:pelela|component)[^>]*view-model\s*=\s*(?:"([^"]+)"|'([^']+)')/i,
  )
  const viewModelName = viewModelMatch?.[1] ?? viewModelMatch?.[2] ?? null

  if (!viewModelName) {
    errorFn(t('errors.compiler.missingViewModel', { filePath }))
    return ''
  }

  return viewModelName
}

export function validatePelelaSource({
  sourceCode,
  filePath,
  knownComponentTags,
  errorFn,
}: ValidatePelelaSourceParams): string {
  validatePelelaStructure(sourceCode, filePath, errorFn)
  validateComponentTagCase(sourceCode, errorFn)
  validateCollapsedComponentTags(sourceCode, knownComponentTags, errorFn)
  validateNoForbiddenRootAttributes(sourceCode, filePath, errorFn)
  validateNoForbiddenHtmlAttributes(sourceCode, filePath, errorFn)
  validateComponentAttributes(sourceCode, errorFn)
  validateBindingElementRestrictions(sourceCode, errorFn)
  validateInputOnlyEvents(sourceCode, errorFn)
  validateNoForeignSyntax(sourceCode, filePath, errorFn)
  return extractViewModelName(sourceCode, filePath, errorFn)
}
