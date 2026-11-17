import { t } from '../commons/i18n'
import { DOMEnvironmentError } from '../errors'
import {
  createToastElement,
  createToastRegion,
  findToastRegion,
  TOAST_LEAVING_CLASS,
  toastRegionKey,
} from './dom'
import { injectToastStyles } from './styles'
import {
  ToastAlignment,
  type ToastAlignment as ToastAlignmentValue,
  type ToastOptions,
  type ToastPosition,
  ToastSeverity,
} from './types'

const DEFAULT_TOAST_DURATION = 4000
const MAX_SET_TIMEOUT_DELAY = 2147483647
const LEAVE_ANIMATION_DURATION = 150
const TOAST_ALIGNMENTS: readonly ToastAlignmentValue[] = Object.values(ToastAlignment)

const defaultPosition: Required<ToastPosition> = {
  horizontal: ToastAlignment.end,
  vertical: ToastAlignment.end,
}

type ActiveToast = {
  element: HTMLElement
  region: HTMLElement
  autoDismissTimer: ReturnType<typeof setTimeout> | undefined
  removeTimer: ReturnType<typeof setTimeout> | undefined
}

const regions = new Map<string, HTMLElement>()
const activeToasts = new Set<ActiveToast>()

function assertDocument(): void {
  if (typeof document === 'undefined' || document.body === null) {
    throw new DOMEnvironmentError()
  }
}

function assertAlignment(
  alignment: ToastAlignmentValue | undefined,
  axis: 'horizontal' | 'vertical',
): void {
  if (alignment !== undefined && !TOAST_ALIGNMENTS.includes(alignment)) {
    throw new Error(t('errors.ui.toast.invalidPosition', { axis, value: String(alignment) }))
  }
}

function assertPosition(position: ToastPosition): void {
  assertAlignment(position.horizontal, 'horizontal')
  assertAlignment(position.vertical, 'vertical')
}

function resolvePosition(options: ToastOptions): Required<ToastPosition> {
  assertPosition(options)
  return {
    horizontal: options.horizontal ?? defaultPosition.horizontal,
    vertical: options.vertical ?? defaultPosition.vertical,
  }
}

function resolveDuration(options: ToastOptions): number {
  const duration = options.duration ?? DEFAULT_TOAST_DURATION
  if (!Number.isFinite(duration) || duration < 0 || duration > MAX_SET_TIMEOUT_DELAY) {
    throw new Error(t('errors.ui.toast.invalidDuration', { value: String(duration) }))
  }
  return duration
}

function getOrCreateRegion(position: Required<ToastPosition>): HTMLElement {
  const key = toastRegionKey(position)
  const cachedRegion = regions.get(key)

  if (cachedRegion?.isConnected) return cachedRegion

  const existingRegion = findToastRegion(position)
  const region = existingRegion ?? createToastRegion(position)
  regions.set(key, region)
  return region
}

function resolveRole(severity: ToastSeverity): string {
  return severity === ToastSeverity.error || severity === ToastSeverity.warning ? 'alert' : 'status'
}

function clearTimer(timer: ReturnType<typeof setTimeout> | undefined): void {
  if (timer !== undefined) clearTimeout(timer)
}

function pruneRegion(region: HTMLElement): void {
  if (region.childElementCount > 0) return

  region.remove()
  regions.forEach((mappedRegion, key) => {
    if (mappedRegion === region) regions.delete(key)
  })
}

function removeActiveToast(activeToast: ActiveToast): void {
  clearTimer(activeToast.autoDismissTimer)
  clearTimer(activeToast.removeTimer)
  activeToast.autoDismissTimer = undefined
  activeToast.removeTimer = undefined
  activeToast.element.remove()
  activeToasts.delete(activeToast)
  pruneRegion(activeToast.region)
}

function dismissToast(activeToast: ActiveToast): void {
  if (activeToast.removeTimer !== undefined) return

  clearTimer(activeToast.autoDismissTimer)
  activeToast.autoDismissTimer = undefined
  activeToast.element.classList.add(TOAST_LEAVING_CLASS)
  activeToast.removeTimer = setTimeout(
    () => removeActiveToast(activeToast),
    LEAVE_ANIMATION_DURATION,
  )
}

export const toast = {
  message(
    message: string,
    severity: ToastSeverity = ToastSeverity.info,
    options: ToastOptions = {},
  ): void {
    assertDocument()

    const position = resolvePosition(options)
    const duration = resolveDuration(options)
    injectToastStyles()
    const region = getOrCreateRegion(position)
    const { element, dismissButton } = createToastElement(
      message,
      severity,
      resolveRole(severity),
      t('errors.ui.toast.dismiss'),
    )

    const activeToast: ActiveToast = {
      element,
      region,
      autoDismissTimer: undefined,
      removeTimer: undefined,
    }

    dismissButton.addEventListener('click', () => dismissToast(activeToast))
    activeToasts.add(activeToast)
    region.appendChild(element)

    if (duration > 0) {
      activeToast.autoDismissTimer = setTimeout(() => dismissToast(activeToast), duration)
    }
  },

  configure(position: ToastPosition): void {
    assertPosition(position)
    defaultPosition.horizontal = position.horizontal ?? defaultPosition.horizontal
    defaultPosition.vertical = position.vertical ?? defaultPosition.vertical
  },

  clear(): void {
    Array.from(activeToasts).forEach((activeToast) => {
      removeActiveToast(activeToast)
    })
    Array.from(regions.values()).forEach((region) => {
      region.remove()
    })
    regions.clear()
  },
}
