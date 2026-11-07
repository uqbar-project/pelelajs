import { afterEach, describe, expect, it, vi } from 'vitest'
import { initializeI18n, t } from '../commons/i18n'
import { DOMEnvironmentError } from '../errors'
import { TOAST_STYLES } from './styles'
import { toast } from './toast'
import { ToastAlignment, type ToastPosition, ToastSeverity } from './types'

const TOAST_SELECTOR = '[data-pelela-toast]'
const REGION_SELECTOR = '[data-pelela-toast-region]'
const STYLE_SELECTOR = '[data-pelela-toast-styles]'
const ICON_SELECTOR = '.pelela-toast__icon'
const MESSAGE_SELECTOR = '.pelela-toast__message'
const DISMISS_SELECTOR = '.pelela-toast__dismiss'
const LEAVING_CLASS = 'pelela-toast--leaving'
const DEFAULT_DURATION = 4000
const LEAVE_DURATION = 150
const MESSAGE = 'Saved'
const OTHER_MESSAGE = 'Not saved'
const UNSAFE_MESSAGE = '<img src=x onerror="alert(1)"><script>alert(1)</script>'
const ALIGNMENTS = [ToastAlignment.start, ToastAlignment.center, ToastAlignment.end] as const
const POSITION_COMBINATIONS = ALIGNMENTS.flatMap((horizontal) =>
  ALIGNMENTS.map((vertical) => ({ horizontal, vertical })),
)
const SEVERITY_COLOR_PAIRS: ReadonlyArray<[ToastSeverity, `#${string}`, `#${string}`]> = [
  [ToastSeverity.info, '#1c6293', '#ffffff'],
  [ToastSeverity.success, '#0a7804', '#ffffff'],
  [ToastSeverity.warning, '#ead560', '#111827'],
  [ToastSeverity.error, '#dc2626', '#ffffff'],
]
const HEX_START_INDEX = 1
const HEX_CHANNEL_OFFSET = 2
const RGB_CHANNEL_MAX = 255
const HEX_COLOR_RADIX = 16
const SRGB_LINEAR_THRESHOLD = 0.03928
const SRGB_LINEAR_DIVISOR = 12.92
const SRGB_GAMMA_OFFSET = 0.055
const SRGB_GAMMA_DIVISOR = 1.055
const SRGB_GAMMA = 2.4
const RELATIVE_LUMINANCE_WEIGHTS = {
  red: 0.2126,
  green: 0.7152,
  blue: 0.0722,
} as const
const _CONTRAST_RATIO_OFFSET = 0.05

function hexChannel(hex: `#${string}`, index: number): number {
  const start = HEX_START_INDEX + index * HEX_CHANNEL_OFFSET
  return Number.parseInt(hex.slice(start, start + HEX_CHANNEL_OFFSET), HEX_COLOR_RADIX)
}

function hexToRgb(hex: `#${string}`): readonly [number, number, number] {
  return [hexChannel(hex, 0), hexChannel(hex, 1), hexChannel(hex, 2)]
}

function channelToLinear(value: number): number {
  const normalized = value / RGB_CHANNEL_MAX
  return normalized <= SRGB_LINEAR_THRESHOLD
    ? normalized / SRGB_LINEAR_DIVISOR
    : ((normalized + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA
}

function relativeLuminance(hex: `#${string}`): number {
  const [red, green, blue] = hexToRgb(hex).map(channelToLinear)
  return (
    RELATIVE_LUMINANCE_WEIGHTS.red * red +
    RELATIVE_LUMINANCE_WEIGHTS.green * green +
    RELATIVE_LUMINANCE_WEIGHTS.blue * blue
  )
}

function contrastRatio(background: `#${string}`, foreground: `#${string}`): number {
  const backgroundLuminance = relativeLuminance(background)
  const foregroundLuminance = relativeLuminance(foreground)
  return (
    (Math.max(backgroundLuminance, foregroundLuminance) + _CONTRAST_RATIO_OFFSET) /
    (Math.min(backgroundLuminance, foregroundLuminance) + _CONTRAST_RATIO_OFFSET)
  )
}

function toasts(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TOAST_SELECTOR))
}

function regions(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(REGION_SELECTOR))
}

function styles(): Element[] {
  return Array.from(document.querySelectorAll(STYLE_SELECTOR))
}

function dismissButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(DISMISS_SELECTOR))
}

function requireToast(index = 0): HTMLElement {
  const element = toasts()[index]
  if (!element) throw new Error(`Expected a toast at index ${index}`)
  return element
}

function regionFor(position: ToastPosition): HTMLElement {
  const region = regions().find(
    (candidate) =>
      candidate.getAttribute('data-horizontal') === position.horizontal &&
      candidate.getAttribute('data-vertical') === position.vertical,
  )
  if (!region) throw new Error(`Expected a toast region for ${JSON.stringify(position)}`)
  return region
}

afterEach(() => {
  toast.clear()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ''
  styles().forEach((styleElement) => {
    styleElement.remove()
  })
  toast.configure({
    horizontal: ToastAlignment.end,
    vertical: ToastAlignment.end,
  })
})

describe('toast.message', () => {
  it('shows an info toast with the default position', () => {
    toast.message(MESSAGE)

    const element = requireToast()
    expect(element.getAttribute('data-severity')).toBe(ToastSeverity.info)
    expect(element.getAttribute('role')).toBe('status')
    expect(element.getAttribute('aria-atomic')).toBe('true')
    expect(element.querySelector(ICON_SELECTOR)?.getAttribute('aria-hidden')).toBe('true')
    expect(element.querySelector(ICON_SELECTOR)?.textContent).toBe('i')
    expect(element.querySelector(MESSAGE_SELECTOR)?.textContent).toBe(MESSAGE)
    expect(element.parentElement).toBe(regions()[0])
  })

  it.each([
    [ToastSeverity.info, 'status', 'i'],
    [ToastSeverity.success, 'status', '✓'],
    [ToastSeverity.warning, 'alert', '!'],
    [ToastSeverity.error, 'alert', '×'],
  ])('shows severity %s with role %s and a decorative icon', (severity, role, icon) => {
    toast.message(MESSAGE, severity)

    const element = requireToast()
    expect(element.getAttribute('data-severity')).toBe(severity)
    expect(element.getAttribute('role')).toBe(role)
    expect(element.querySelector(ICON_SELECTOR)?.getAttribute('aria-hidden')).toBe('true')
    expect(element.querySelector(ICON_SELECTOR)?.textContent).toBe(icon)
  })

  it('treats the message as text, never as HTML', () => {
    toast.message(UNSAFE_MESSAGE, ToastSeverity.error)

    const element = requireToast()
    expect(element.querySelector('img')).toBeNull()
    expect(element.querySelector('script')).toBeNull()
    expect(element.querySelector('[onerror]')).toBeNull()
    expect(element.querySelector(MESSAGE_SELECTOR)?.textContent).toBe(UNSAFE_MESSAGE)
    expect(element.childElementCount).toBe(3)
  })

  it('creates the styles and the default region once', () => {
    toast.message(MESSAGE)
    toast.message(OTHER_MESSAGE)

    expect(styles()).toHaveLength(1)
    expect(styles()[0]?.textContent).toBe(TOAST_STYLES)
    expect(regions()).toHaveLength(1)
    expect(toasts()).toHaveLength(2)
    expect(regions()[0]?.getAttribute('data-horizontal')).toBe(ToastAlignment.end)
    expect(regions()[0]?.getAttribute('data-vertical')).toBe(ToastAlignment.end)
  })

  it('keeps message text on one horizontal run until it reaches the max width', () => {
    expect(TOAST_STYLES).toContain('width: min(28rem, 100%);')
    expect(TOAST_STYLES).toContain('min-width: min(18rem, 100%);')
    expect(TOAST_STYLES).toContain('align-items: center;')
    expect(TOAST_STYLES).toContain('overflow-wrap: break-word;')
    expect(TOAST_STYLES).not.toContain('overflow-wrap: anywhere;')
  })

  it.each(SEVERITY_COLOR_PAIRS)(
    'meets the 4.5:1 contrast requirement for %s',
    (_severity, background, ink) => {
      expect(TOAST_STYLES).toContain(`--pelela-toast-bg: ${background};`)
      expect(TOAST_STYLES).toContain(`--pelela-toast-ink: ${ink};`)
      expect(contrastRatio(background, ink)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('fills the whole toast with the severity background color', () => {
    expect(TOAST_STYLES).toContain('background: var(--pelela-toast-bg);')
    expect(TOAST_STYLES).toContain('color: var(--pelela-toast-ink);')
  })

  it('creates the styles again after they are removed from the document', () => {
    toast.message(MESSAGE)
    styles()[0]?.remove()
    expect(styles()).toHaveLength(0)

    toast.message(OTHER_MESSAGE)

    expect(styles()).toHaveLength(1)
    expect(toasts()).toHaveLength(2)
  })

  it('recreates a region that was removed from the document', () => {
    toast.message(MESSAGE)
    regions()[0]?.remove()
    expect(regions()).toHaveLength(0)

    toast.message(OTHER_MESSAGE)

    expect(regions()).toHaveLength(1)
    expect(toasts()).toHaveLength(1)
    expect(requireToast().querySelector(MESSAGE_SELECTOR)?.textContent).toBe(OTHER_MESSAGE)
  })

  it('uses the translated dismiss label in English', () => {
    toast.message(MESSAGE)

    expect(dismissButtons()[0]?.getAttribute('aria-label')).toBe(t('errors.ui.toast.dismiss'))
  })

  it('uses the translated dismiss label in Spanish', () => {
    initializeI18n('es')
    toast.message(MESSAGE)

    expect(dismissButtons()[0]?.getAttribute('aria-label')).toBe(t('errors.ui.toast.dismiss'))
  })

  it('fails fast when no DOM environment is available', () => {
    vi.stubGlobal('document', undefined)

    let error: unknown
    try {
      toast.message(MESSAGE)
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).toBeInstanceOf(DOMEnvironmentError)
    expect((error as Error).message).toBe(t('errors.security.domEnvironmentRequired'))
  })

  it('fails fast when document.body is null', () => {
    vi.stubGlobal('document', { body: null, head: null })

    let error: unknown
    try {
      toast.message(MESSAGE)
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).toBeInstanceOf(DOMEnvironmentError)
    expect((error as Error).message).toBe(t('errors.security.domEnvironmentRequired'))
  })
})

describe('toast.configure', () => {
  it('applies the global position to new toasts', () => {
    toast.configure({
      horizontal: ToastAlignment.center,
      vertical: ToastAlignment.start,
    })
    toast.message(MESSAGE)

    const region = regionFor({
      horizontal: ToastAlignment.center,
      vertical: ToastAlignment.start,
    })
    expect(requireToast().parentElement).toBe(region)
  })

  it('does not move toasts that are already visible', () => {
    toast.message(MESSAGE)
    const originalRegion = regions()[0]
    toast.configure({
      horizontal: ToastAlignment.center,
      vertical: ToastAlignment.start,
    })
    toast.message(OTHER_MESSAGE)

    const createdRegions = regions()
    expect(createdRegions).toHaveLength(2)
    expect(createdRegions[0]).toBe(originalRegion)
    expect(requireToast(0).parentElement).toBe(originalRegion)
    expect(requireToast(1).parentElement).toBe(createdRegions[1])
  })

  it('keeps the other axis when configure is partial', () => {
    toast.configure({ vertical: ToastAlignment.start })
    toast.configure({ horizontal: ToastAlignment.center })
    toast.message(MESSAGE)

    expect(regionFor({ horizontal: ToastAlignment.center, vertical: ToastAlignment.start }))
    expect(regions()[0]?.getAttribute('data-horizontal')).toBe(ToastAlignment.center)
    expect(regions()[0]?.getAttribute('data-vertical')).toBe(ToastAlignment.start)
  })

  it('rejects an invalid global alignment and does not save it', () => {
    let error: unknown
    try {
      toast.configure({ horizontal: 'middle' as ToastAlignment })
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(
      t('errors.ui.toast.invalidPosition', { axis: 'horizontal', value: 'middle' }),
    )

    toast.message(MESSAGE)
    expect(regions()[0]?.getAttribute('data-horizontal')).toBe(ToastAlignment.end)
  })
})

describe('toast positioning', () => {
  it.each(POSITION_COMBINATIONS.filter((position) => position.horizontal === position.vertical))(
    'creates a region for %s and %s',
    (position) => {
      toast.message(MESSAGE, ToastSeverity.info, position)

      const region = regionFor(position)
      expect(region.getAttribute('data-horizontal')).toBe(position.horizontal)
      expect(region.getAttribute('data-vertical')).toBe(position.vertical)
      expect(requireToast().parentElement).toBe(region)
    },
  )

  it('creates regions for every alignment combination', () => {
    POSITION_COMBINATIONS.forEach((position) => {
      toast.message(MESSAGE, ToastSeverity.info, position)
    })

    expect(regions()).toHaveLength(POSITION_COMBINATIONS.length)
    expect(toasts()).toHaveLength(POSITION_COMBINATIONS.length)
  })

  it('lets a toast override the global position', () => {
    toast.message(MESSAGE)
    toast.message(OTHER_MESSAGE, ToastSeverity.info, {
      horizontal: ToastAlignment.start,
      vertical: ToastAlignment.start,
    })

    const positions = toasts().map((element) => [
      element.parentElement?.getAttribute('data-horizontal'),
      element.parentElement?.getAttribute('data-vertical'),
    ])
    expect(positions).toEqual([
      [ToastAlignment.end, ToastAlignment.end],
      [ToastAlignment.start, ToastAlignment.start],
    ])
  })

  it('reuses one region for toasts shown in the same position', () => {
    toast.message(MESSAGE, ToastSeverity.info, {
      horizontal: ToastAlignment.start,
      vertical: ToastAlignment.start,
    })
    toast.message(OTHER_MESSAGE, ToastSeverity.info, {
      horizontal: ToastAlignment.start,
      vertical: ToastAlignment.start,
    })
    toast.message(MESSAGE)

    expect(regions()).toHaveLength(2)
    expect(toasts()).toHaveLength(3)
    expect(
      regionFor({ horizontal: ToastAlignment.start, vertical: ToastAlignment.start })
        .childElementCount,
    ).toBe(2)
    expect(
      regionFor({ horizontal: ToastAlignment.end, vertical: ToastAlignment.end }).childElementCount,
    ).toBe(1)
  })

  it('rejects an invalid per-toast alignment and does not create a region', () => {
    let error: unknown
    try {
      toast.message(MESSAGE, ToastSeverity.info, {
        vertical: 'middle' as ToastAlignment,
      })
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(
      t('errors.ui.toast.invalidPosition', { axis: 'vertical', value: 'middle' }),
    )
    expect(toasts()).toHaveLength(0)
    expect(regions()).toHaveLength(0)
  })
})

describe('toast duration and dismissal', () => {
  it('dismisses a toast after the default duration', () => {
    vi.useFakeTimers()
    toast.message(MESSAGE)

    vi.advanceTimersByTime(DEFAULT_DURATION - 1)
    expect(toasts()).toHaveLength(1)
    expect(requireToast().classList.contains(LEAVING_CLASS)).toBe(false)

    vi.advanceTimersByTime(1)
    expect(requireToast().classList.contains(LEAVING_CLASS)).toBe(true)

    vi.advanceTimersByTime(LEAVE_DURATION - 1)
    expect(toasts()).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(toasts()).toHaveLength(0)
    expect(regions()).toHaveLength(0)
  })

  it('dismisses a toast after a custom duration', () => {
    vi.useFakeTimers()
    const customDuration = 1000
    toast.message(MESSAGE, ToastSeverity.info, { duration: customDuration })

    vi.advanceTimersByTime(customDuration)
    expect(requireToast().classList.contains(LEAVING_CLASS)).toBe(true)

    vi.advanceTimersByTime(LEAVE_DURATION)
    expect(toasts()).toHaveLength(0)
  })

  it('keeps a toast visible when duration is zero until the button is clicked', () => {
    vi.useFakeTimers()
    toast.message(MESSAGE, ToastSeverity.info, { duration: 0 })

    vi.advanceTimersByTime(60000)
    expect(toasts()).toHaveLength(1)
    expect(requireToast().classList.contains(LEAVING_CLASS)).toBe(false)

    dismissButtons()[0]?.click()
    expect(requireToast().classList.contains(LEAVING_CLASS)).toBe(true)

    vi.advanceTimersByTime(LEAVE_DURATION - 1)
    expect(toasts()).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(toasts()).toHaveLength(0)
    expect(regions()).toHaveLength(0)
  })

  it('stops the auto-dismiss timer when a toast is dismissed manually', () => {
    vi.useFakeTimers()
    toast.message(MESSAGE, ToastSeverity.info, { duration: 1000 })

    dismissButtons()[0]?.click()
    vi.advanceTimersByTime(LEAVE_DURATION)

    expect(toasts()).toHaveLength(0)
    vi.advanceTimersByTime(DEFAULT_DURATION)
    expect(toasts()).toHaveLength(0)
  })
})

describe('toast.clear', () => {
  it('removes every toast and every region', () => {
    vi.useFakeTimers()
    toast.message(MESSAGE, ToastSeverity.info, { duration: 0 })
    toast.message(OTHER_MESSAGE, ToastSeverity.info, {
      horizontal: ToastAlignment.start,
      vertical: ToastAlignment.start,
    })

    toast.clear()

    expect(toasts()).toHaveLength(0)
    expect(regions()).toHaveLength(0)
    vi.advanceTimersByTime(DEFAULT_DURATION + LEAVE_DURATION)
    expect(toasts()).toHaveLength(0)
  })

  it('removes a region that contains content added outside the toast service', () => {
    toast.message(MESSAGE, ToastSeverity.info, { duration: 0 })
    const region = regions()[0]
    region?.appendChild(document.createElement('div'))

    toast.clear()

    expect(toasts()).toHaveLength(0)
    expect(regions()).toHaveLength(0)
  })

  it('cancels an in-progress leave animation', () => {
    vi.useFakeTimers()
    toast.message(MESSAGE, ToastSeverity.info, { duration: 0 })
    dismissButtons()[0]?.click()

    toast.clear()
    expect(toasts()).toHaveLength(0)
    expect(regions()).toHaveLength(0)

    vi.advanceTimersByTime(LEAVE_DURATION)
    expect(toasts()).toHaveLength(0)
    expect(regions()).toHaveLength(0)
  })
})
