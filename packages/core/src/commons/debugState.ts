import { describeElement } from './helpers'
import { t } from './i18n'

let debugEnabled = false

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled
}

export function isDebugEnabled(debug?: boolean): boolean {
  return debug ?? debugEnabled
}

let eventCounter = 0

export function nextEventId(): number {
  return ++eventCounter
}

export function debugLog(
  debug: boolean | undefined,
  key: Parameters<typeof t>[0],
  params?: Record<string, unknown>,
): void {
  if (!isDebugEnabled(debug)) return
  const formattedParams = params ? { ...params } : undefined
  if (formattedParams && formattedParams.element instanceof HTMLElement) {
    formattedParams.element = describeElement(formattedParams.element)
  }
  console.log(t(key as never, formattedParams))
}
