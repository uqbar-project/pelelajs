import { setupBindings } from '../bindings/setupBindings'
import { initializeI18n } from '../commons/i18n'
import { ViewModelRegistrationError } from '../errors/index'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { getViewModel } from '../registry/viewModelRegistry'
import type { PelelaOptions } from '../types'

export function bootstrap(options: PelelaOptions = {}): void {
  initializeI18n()
  const doc = options.document ?? window.document
  const searchRoot: ParentNode = options.root ?? doc

  const roots = Array.from(searchRoot.querySelectorAll<HTMLElement>('pelela[view-model]'))

  if (roots.length === 0) {
    console.warn('[pelela] No <pelela view-model="..."> elements found')
  }

  roots.forEach((root) => {
    const name = root.getAttribute('view-model')
    if (!name) return

    const ctor = getViewModel(name)
    if (!ctor) {
      throw new ViewModelRegistrationError(name, 'missing')
    }

    const instance = new ctor()

    let render: (changedPath?: string) => void = () => {}

    const reactiveInstance = createReactiveViewModel(
      instance as Record<string, unknown>,
      (changedPath: string) => {
        render(changedPath)
      },
    )

    ;(root as HTMLElement & { __pelelaViewModel: unknown }).__pelelaViewModel = reactiveInstance

    render = setupBindings(root, reactiveInstance)

    console.log(`[pelela] View model "${name}" instantiated and bound`, reactiveInstance)
  })
}
