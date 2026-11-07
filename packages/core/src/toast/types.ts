export const ToastSeverity = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
} as const

export type ToastSeverity = (typeof ToastSeverity)[keyof typeof ToastSeverity]

export const ToastAlignment = {
  start: 'start',
  center: 'center',
  end: 'end',
} as const

export type ToastAlignment = (typeof ToastAlignment)[keyof typeof ToastAlignment]

export type ToastPosition = {
  horizontal?: ToastAlignment
  vertical?: ToastAlignment
}

export type ToastOptions = ToastPosition & {
  duration?: number
}
