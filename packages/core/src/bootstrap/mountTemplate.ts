import { isPelelaRootTag, isStandardHtmlTag } from '../commons/dom'
import { initializeI18n, t } from '../commons/i18n'
import { escapeHTML, sanitizeHTML } from '../commons/sanitization'
import { bootstrap } from './bootstrap'

function isInsideRoot(index: number, templateHtml: string, pelelaMatch: RegExpMatchArray): boolean {
  if (pelelaMatch.index === undefined) return false
  const rootTag = templateHtml[pelelaMatch.index + 1] === 'p' ? 'pelela' : 'component'
  const closeTag = `</${rootTag}>`

  let depth = 0
  let i = pelelaMatch.index
  while (i < templateHtml.length) {
    if (
      templateHtml.startsWith(`<${rootTag}`, i) &&
      /[\s>]/.test(templateHtml[i + rootTag.length + 1] ?? '')
    ) {
      depth++
    } else if (templateHtml.startsWith(closeTag, i)) {
      depth--
      if (depth === 0) {
        return index > pelelaMatch.index && index < i + closeTag.length
      }
    }
    i++
  }
  return false
}

function isInsideAnyRoot(
  index: number,
  templateHtml: string,
  pelelaMatches: RegExpMatchArray[],
): boolean {
  return pelelaMatches.some((pelelaMatch) => isInsideRoot(index, templateHtml, pelelaMatch))
}

function validateNoDirectivesOutsideRoot(templateHtml: string): void {
  const pelelaMatches = Array.from(templateHtml.matchAll(/<(?:pelela|component)\b/g))

  const directivePatterns = [
    /\bprop-[a-zA-Z0-9_-]+\b/g,
    /\blink-[a-zA-Z0-9_-]+\b/g,
    /\bconst-[a-zA-Z0-9_-]+\b/g,
    /\bbind-[a-zA-Z0-9_-]+\b/g,
    /\bfor-each\s*=\s*"/g,
    /\bfor-each\s*='/g,
    /\bif\s*=\s*"/g,
    /\bif\s*='/g,
  ]

  directivePatterns.forEach((pattern) => {
    const matches = templateHtml.matchAll(pattern)
    for (const match of matches) {
      const directiveIndex = match.index

      if (!isInsideAnyRoot(directiveIndex, templateHtml, pelelaMatches)) {
        const directive = match[0]
        throw new Error(
          t('errors.compiler.directiveOutsideRoot', {
            filePath: 'runtime',
            tagName: 'pelela',
            directive,
            snippet: templateHtml.slice(
              Math.max(0, directiveIndex - 20),
              Math.min(templateHtml.length, directiveIndex + 20),
            ),
          }),
        )
      }
    }
  })
}

function validateNoComponentsOutsideRoot(templateHtml: string): void {
  const pelelaMatches = Array.from(templateHtml.matchAll(/<(?:pelela|component)\b/g))

  const componentPattern = /<([\w-]+)([^>]*)>/g

  const matches = templateHtml.matchAll(componentPattern)
  for (const match of matches) {
    const tagName = match[1].toLowerCase()
    const attributes = match[2]
    const componentIndex = match.index

    const isRootTag = isPelelaRootTag(tagName)
    const isStandardTag = isStandardHtmlTag(tagName)

    if (!isRootTag && !isStandardTag) {
      const hasComponentAttributes = /prop-|link-|const-/.test(attributes)
      if (hasComponentAttributes && !isInsideAnyRoot(componentIndex, templateHtml, pelelaMatches)) {
        throw new Error(
          t('errors.compiler.directiveOutsideRoot', {
            filePath: 'runtime',
            tagName: 'pelela',
            directive: `component <${tagName}> with component attributes`,
            snippet: `<${tagName}${attributes}>`,
          }),
        )
      }
    }
  }
}

const ERROR_PAGE_CSS = `
@import 'https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&display=swap';

body {
  font-family: Geist, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  padding: 40px;
}

.error-header {
  color: #e53e3e;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-icon {
  font-size: 32px;
}

.error-message {
  background: #fff5f5;
  border-left: 4px solid #e53e3e;
  padding: 16px;
  margin: 20px 0;
  border-radius: 4px;
  color: #c53030;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-stack {
  font-family: monospace, 'Consolas', 'Monaco', 'Courier New';
  background: #f7fafc;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.error-stack-title {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 12px;
}

.error-stack-content {
  font-size: 12px;
  color: #718096;
  white-space: pre-wrap;
  word-break: break-word;
}
`

export function renderErrorPage(error: Error, container?: HTMLElement): void {
  const stack = error.stack || ''
  const processedStack =
    stack.replace(/https?:\/\/localhost:\d+\/(?:@fs\/)?([^\s()]+)/g, (_match, fullPath) => {
      if (fullPath.includes('/dist/')) {
        const filenameMatch = fullPath.match(/([^/]+:\d+:\d+)$/)
        return filenameMatch ? filenameMatch[1] : fullPath
      }
      return fullPath
    }) || t('errors.ui.errorPage.noStack')

  const errorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('errors.ui.errorPage.title')}</title>
  <style>
${ERROR_PAGE_CSS}
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-header">
      <span class="error-icon">❌</span>
      <span>${t('errors.ui.errorPage.header')}</span>
    </div>
    <div class="error-message">${escapeHTML(error.message)}</div>
    <div class="error-stack">
      <div class="error-stack-title">${t('errors.ui.errorPage.stackTrace')}</div>
      <div class="error-stack-content">${escapeHTML(processedStack)}</div>
    </div>
  </div>
</body>
</html>
  `
  if (container) {
    container.innerHTML = errorHtml
  } else {
    document.body.innerHTML = errorHtml
  }
}

export function handleError(error: Error, container?: HTMLElement): void {
  console.error(error)
  if (error instanceof Error) {
    renderErrorPage(error, container)
  } else {
    renderErrorPage(new Error(String(error)), container)
  }
}

export function mountTemplate(container: HTMLElement, templateHtml: string): void {
  try {
    initializeI18n()
    validateNoDirectivesOutsideRoot(templateHtml)
    validateNoComponentsOutsideRoot(templateHtml)
    const sanitizedHtml = sanitizeHTML(templateHtml)
    container.innerHTML = sanitizedHtml
    bootstrap({ root: container })
  } catch (error) {
    handleError(error as Error, container)
  }
}
