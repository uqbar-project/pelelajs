import { initializeI18n } from '../commons/i18n'
import { escapeHTML, sanitizeHTML } from '../commons/sanitization'
import { bootstrap } from './bootstrap'

const ERROR_PAGE_CSS = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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

export function renderErrorPage(error: Error): void {
  const processedStack =
    error.stack?.replace(/https?:\/\/localhost:\d+\/(?:@fs\/)?([^\s()]+)/g, (_match, fullPath) => {
      if (fullPath.includes('/dist/')) {
        const filenameMatch = fullPath.match(/([^/]+:\d+:\d+)$/)
        return filenameMatch ? filenameMatch[1] : fullPath
      }
      return fullPath
    }) ||
    error.stack ||
    'No stack trace available'

  const errorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pelela Error</title>
  <style>
${ERROR_PAGE_CSS}
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-header">
      <span class="error-icon">❌</span>
      <span>Pelela Error</span>
    </div>
    <div class="error-message">${escapeHTML(error.message)}</div>
    <div class="error-stack">
      <div class="error-stack-title">Stack Trace:</div>
      <div class="error-stack-content">${escapeHTML(processedStack)}</div>
    </div>
  </div>
</body>
</html>
  `
  document.body.innerHTML = errorHtml
}

export function handleError(error: Error): void {
  console.error(error)
  if (error instanceof Error) {
    renderErrorPage(error)
  } else {
    renderErrorPage(new Error(String(error)))
  }
}

export function mountTemplate(container: HTMLElement, templateHtml: string): void {
  try {
    initializeI18n()
    const sanitizedHtml = sanitizeHTML(templateHtml)
    container.innerHTML = sanitizedHtml
    bootstrap({ root: container })
  } catch (error) {
    handleError(error as Error)
  }
}
