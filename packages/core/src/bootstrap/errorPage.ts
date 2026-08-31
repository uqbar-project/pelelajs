import { t } from '../commons/i18n'
import { escapeHTML } from '../commons/sanitization'

const ERROR_PAGE_CSS = `
@import 'https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&display=swap';

/* The application stylesheet is still loaded, so every property that could constrain the
   error page has to be reset explicitly, not just the ones we set. */
body {
  box-sizing: border-box;
  font-family: Geist, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 40px 20px;
  max-width: none;
  width: auto;
  min-height: 100vh;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-container {
  box-sizing: border-box;
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

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function createErrorPageHtml(error: Error): string {
  const stack = error.stack || ''
  const processedStack =
    stack.replace(/https?:\/\/localhost:\d+\/(?:@fs\/)?([^\s()]+)/g, (_match, fullPath) => {
      if (fullPath.includes('/dist/')) {
        const filenameMatch = fullPath.match(/([^/]+:\d+:\d+)$/)
        return filenameMatch ? filenameMatch[1] : fullPath
      }
      return fullPath
    }) || t('errors.ui.errorPage.noStack')

  return `
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
}

export function renderErrorPage(error: unknown, container?: HTMLElement): void {
  console.error(error)
  const errorHtml = createErrorPageHtml(normalizeError(error))
  const target = container ?? document.body
  target.innerHTML = errorHtml
}
