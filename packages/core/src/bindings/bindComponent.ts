import { setupBindings } from './setupBindings'
import type { ViewModel } from './types'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { scanComponents, hasComponentElements } from '../components/componentScanner'
import type { ComponentInstance } from '../components/componentScanner'
import { createComponentViewModel } from '../components/componentViewModel'
import { getGlobalComponentTracker } from '../components/nestedComponents'

export type ComponentBinding = {
  componentName: string
  originalElement: HTMLElement
  mountedElement: HTMLElement
  componentInstance: any
  reactiveInstance: any
  render: (changedPath?: string) => void
}

function parseTemplate(templateString: string): HTMLElement {
  const parser = new DOMParser()
  const doc = parser.parseFromString(templateString, 'text/html')
  const root = doc.body.firstElementChild

  if (!root) {
    throw new Error('[pelela] Component template is empty or invalid')
  }

  return root as HTMLElement
}

function replaceComponentTagWithTemplate(
  componentTag: string,
  templateHtml: string,
): HTMLElement {
  const cleaned = templateHtml.replace(/<component\b[^>]*>/i, '').replace(/<\/component>/i, '')
  const wrapper = document.createElement('div')
  wrapper.innerHTML = cleaned.trim()

  const firstChild = wrapper.firstElementChild
  if (!firstChild) {
    const span = document.createElement('span')
    span.textContent = cleaned.trim()
    return span as HTMLElement
  }

  return firstChild as HTMLElement
}

function instantiateComponent(componentInstance: ComponentInstance, parentViewModel: ViewModel) {
  const { config, props } = componentInstance
  const instance = new config.viewModelConstructor()

  const extendedViewModel = createComponentViewModel(instance, parentViewModel, {
    unidirectional: props.unidirectional,
    bidirectional: props.bidirectional,
  })

  return { instance, extendedViewModel }
}

function setupSingleComponentBinding(
  componentInstance: ComponentInstance,
  parentViewModel: ViewModel,
): ComponentBinding {
  const { element, config, componentName } = componentInstance
  const tracker = getGlobalComponentTracker()

  tracker.enterComponent(componentName)

  try {
    const { instance, extendedViewModel } = instantiateComponent(componentInstance, parentViewModel)

    const templateElement = replaceComponentTagWithTemplate(componentName, config.template)

    let render: (changedPath?: string) => void = () => {}

    const reactiveInstance = createReactiveViewModel(
      extendedViewModel as Record<string, unknown>,
      (changedPath: string) => {
        render(changedPath)
      },
    )

    ;(templateElement as any).__pelelaViewModel = reactiveInstance

    render = setupBindings(templateElement, reactiveInstance)

    const parent = element.parentNode
    if (parent) {
      parent.replaceChild(templateElement, element)
    }

    return {
      componentName,
      originalElement: element,
      mountedElement: templateElement,
      componentInstance: instance,
      reactiveInstance,
      render,
    }
  } finally {
    tracker.exitComponent()
  }
}

export function setupComponentBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): ComponentBinding[] {
  const bindings: ComponentBinding[] = []
  let currentRoot = root
  let iterationCount = 0
  const maxIterations = 100

  while (hasComponentElements(currentRoot) && iterationCount < maxIterations) {
    iterationCount++

    const components = scanComponents(currentRoot)

    if (components.length === 0) {
      break
    }

    console.log(
      `[pelela] Iteration ${iterationCount}: Found ${components.length} component instance(s) to mount`,
    )

    for (const component of components) {
      try {
        const binding = setupSingleComponentBinding(component, viewModel)
        bindings.push(binding)
        console.log(`[pelela] Component "${component.componentName}" mounted successfully`)
      } catch (error) {
        console.error(`[pelela] Failed to mount component "${component.componentName}":`, error)
        throw error
      }
    }
  }

  if (iterationCount >= maxIterations) {
    console.warn(
      '[pelela] Maximum component nesting iterations reached. Possible infinite recursion?',
    )
  }

  console.log(`[pelela] Total components mounted: ${bindings.length}`)

  return bindings
}

export function renderComponentBindings(bindings: ComponentBinding[]): void {
  for (const binding of bindings) {
    binding.render()
  }
}

