import { setupBindings } from '../bindings/setupBindings'
import { createStylesheetLink, findExistingStylesheetLink } from '../commons/cssLoader'
import { isDebugEnabled } from '../commons/debugState'
import { unwrapTemplate } from '../commons/helpers'
import { initializeI18n, t } from '../commons/i18n'
import { sanitizeHTML } from '../commons/sanitization'
import { ViewModelRegistrationError } from '../errors/index'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { getComponentEntry } from '../registry/componentRegistry'
import { getViewModel } from '../registry/viewModelRegistry'
import type { PelelaOptions } from '../types'

let isRouterActive = false

export function setRouterActive(): void {
  isRouterActive = true
}

export function getRouterActive(): boolean {
  return isRouterActive
}

export function resetRouterActive(): void {
  isRouterActive = false
}

const loadedCssUrls = new Set<string>()

function loadCss(cssUrl: string): void {
  if (loadedCssUrls.has(cssUrl)) {
    return
  }
  const existingLink = findExistingStylesheetLink(cssUrl)
  if (!existingLink) {
    const linkElement = createStylesheetLink(cssUrl)
    document.head.appendChild(linkElement)
  }
  loadedCssUrls.add(cssUrl)
}

function bindRoot(root: HTMLElement, options: PelelaOptions): void {
  const name = root.getAttribute('view-model')
  if (!name) return
  const creator = getViewModel(name)
  if (!creator) {
    throw new ViewModelRegistrationError(name, 'missing')
  }
  const componentEntry = getComponentEntry(creator)
  const needsDefaultTemplate = root.innerHTML.trim() === ''
  if (componentEntry && needsDefaultTemplate) {
    const sanitized = sanitizeHTML(componentEntry.template)
    root.innerHTML = unwrapTemplate(sanitized)
  }
  if (componentEntry?.cssUrls && !getRouterActive()) {
    for (const cssUrl of componentEntry.cssUrls) {
      loadCss(cssUrl)
    }
  }
  const instance = new creator()
  const debug = options.debug ?? isDebugEnabled()
  let render: (changedPath?: string) => void = () => {}
  const reactiveInstance = createReactiveViewModel(
    instance as Record<string, unknown>,
    (changedPath: string) => {
      render(changedPath)
    },
  )
  ;(root as HTMLElement & { __pelelaViewModel: unknown }).__pelelaViewModel = reactiveInstance
  render = setupBindings(root, reactiveInstance, { debug })

  if (typeof reactiveInstance.initialize === 'function') {
    reactiveInstance.initialize()
  }
}

export function bootstrap(options: PelelaOptions = {}): void {
  initializeI18n()
  const doc = options.document ?? window.document
  const searchRoot: ParentNode = options.root ?? doc
  const roots = Array.from(searchRoot.querySelectorAll<HTMLElement>('pelela[view-model]'))
  if (roots.length === 0) {
    console.warn(t('debug.noPelelaElements'))
  }
  roots.forEach((root) => {
    bindRoot(root, options)
  })
}
