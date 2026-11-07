import { DOMEnvironmentError } from '../errors'

export const TOAST_STYLES_ATTRIBUTE = 'data-pelela-toast-styles'

export const TOAST_STYLES = `
.pelela-toast-region {
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  pointer-events: none;
}

.pelela-toast-region[data-horizontal='start'] {
  align-items: flex-start;
}

.pelela-toast-region[data-horizontal='center'] {
  align-items: center;
}

.pelela-toast-region[data-horizontal='end'] {
  align-items: flex-end;
}

.pelela-toast-region[data-vertical='start'] {
  justify-content: flex-start;
  --pelela-toast-offset: -0.5rem;
}

.pelela-toast-region[data-vertical='center'] {
  justify-content: center;
  --pelela-toast-offset: 0;
}

.pelela-toast-region[data-vertical='end'] {
  justify-content: flex-end;
  --pelela-toast-offset: 0.5rem;
}

.pelela-toast {
  --pelela-toast-bg: #003153;
  --pelela-toast-ink: #ffffff;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  width: min(28rem, 100%);
  min-width: min(18rem, 100%);
  padding: 0.875rem 1rem;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  background: var(--pelela-toast-bg);
  color: var(--pelela-toast-ink);
  box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 15%);
  font: inherit;
  pointer-events: auto;
  animation: pelela-toast-in 150ms ease-out;
}

.pelela-toast[data-severity='info'] {
  --pelela-toast-bg: #1c6293;
  --pelela-toast-ink: #ffffff;
}

.pelela-toast[data-severity='success'] {
  --pelela-toast-bg: #0a7804;
  --pelela-toast-ink: #ffffff;
}

.pelela-toast[data-severity='warning'] {
  --pelela-toast-bg: #ead560;
  --pelela-toast-ink: #111827;
}

.pelela-toast[data-severity='error'] {
  --pelela-toast-bg: #dc2626;
  --pelela-toast-ink: #ffffff;
}

.pelela-toast__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  color: inherit;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
}

.pelela-toast__message {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: inherit;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: normal;
  text-align: left;
  text-transform: none;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
  hyphens: none;
}

.pelela-toast__dismiss {
  flex: 0 0 auto;
  width: auto;
  min-width: 0;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 0.25rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.pelela-toast__dismiss:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.pelela-toast--leaving {
  animation: pelela-toast-out 150ms ease-in forwards;
}

@keyframes pelela-toast-in {
  from {
    opacity: 0;
    transform: translateY(var(--pelela-toast-offset, 0.5rem)) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pelela-toast-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  to {
    opacity: 0;
    transform: translateY(var(--pelela-toast-offset, 0.5rem)) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pelela-toast,
  .pelela-toast--leaving {
    animation: none;
  }
}
`

function findToastStyles(): HTMLStyleElement | null {
  return document.querySelector(`style[${TOAST_STYLES_ATTRIBUTE}]`) as HTMLStyleElement | null
}

export function injectToastStyles(): void {
  if (typeof document === 'undefined' || document.head === null) {
    throw new DOMEnvironmentError()
  }

  if (findToastStyles()) return

  const styleElement = document.createElement('style')
  styleElement.setAttribute(TOAST_STYLES_ATTRIBUTE, '')
  styleElement.textContent = TOAST_STYLES
  document.head.appendChild(styleElement)
}
