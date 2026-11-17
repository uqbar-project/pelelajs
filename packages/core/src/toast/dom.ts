import type { ToastPosition, ToastSeverity } from './types'

export const TOAST_REGION_ATTRIBUTE = 'data-pelela-toast-region'
export const TOAST_ATTRIBUTE = 'data-pelela-toast'
export const TOAST_SEVERITY_ATTRIBUTE = 'data-severity'
export const TOAST_HORIZONTAL_ATTRIBUTE = 'data-horizontal'
export const TOAST_VERTICAL_ATTRIBUTE = 'data-vertical'
export const TOAST_CLASS = 'pelela-toast'
export const TOAST_LEAVING_CLASS = 'pelela-toast--leaving'
export const TOAST_ICON_CLASS = 'pelela-toast__icon'
export const TOAST_MESSAGE_CLASS = 'pelela-toast__message'
export const TOAST_DISMISS_CLASS = 'pelela-toast__dismiss'
export const TOAST_REGION_CLASS = 'pelela-toast-region'

export type ToastElements = {
  element: HTMLDivElement
  dismissButton: HTMLButtonElement
}

function regionSelector(position: Required<ToastPosition>): string {
  return (
    `[${TOAST_REGION_ATTRIBUTE}][${TOAST_HORIZONTAL_ATTRIBUTE}="${position.horizontal}"]` +
    `[${TOAST_VERTICAL_ATTRIBUTE}="${position.vertical}"]`
  )
}

function regionKey(position: Required<ToastPosition>): string {
  return `${position.horizontal}:${position.vertical}`
}

export function findToastRegion(position: Required<ToastPosition>): HTMLElement | null {
  return document.querySelector(regionSelector(position)) as HTMLElement | null
}

export function createToastRegion(position: Required<ToastPosition>): HTMLElement {
  const region = document.createElement('div')
  region.className = TOAST_REGION_CLASS
  region.setAttribute(TOAST_REGION_ATTRIBUTE, '')
  region.setAttribute(TOAST_HORIZONTAL_ATTRIBUTE, position.horizontal)
  region.setAttribute(TOAST_VERTICAL_ATTRIBUTE, position.vertical)
  document.body.appendChild(region)
  return region
}

export function toastRegionKey(position: Required<ToastPosition>): string {
  return regionKey(position)
}

export function createToastElement(
  message: string,
  severity: ToastSeverity,
  role: string,
  dismissLabel: string,
): ToastElements {
  const element = document.createElement('div')
  element.className = TOAST_CLASS
  element.setAttribute(TOAST_ATTRIBUTE, '')
  element.setAttribute(TOAST_SEVERITY_ATTRIBUTE, severity)
  element.setAttribute('role', role)
  element.setAttribute('aria-atomic', 'true')

  const iconElement = document.createElement('span')
  iconElement.className = TOAST_ICON_CLASS
  iconElement.setAttribute('aria-hidden', 'true')
  iconElement.textContent =
    severity === 'success' ? '✓' : severity === 'warning' ? '!' : severity === 'error' ? '×' : 'i'

  const messageElement = document.createElement('span')
  messageElement.className = TOAST_MESSAGE_CLASS
  messageElement.textContent = message

  const dismissButton = document.createElement('button')
  dismissButton.type = 'button'
  dismissButton.className = TOAST_DISMISS_CLASS
  dismissButton.setAttribute('aria-label', dismissLabel)
  dismissButton.textContent = '×'

  element.appendChild(iconElement)
  element.appendChild(messageElement)
  element.appendChild(dismissButton)

  return { element, dismissButton }
}
