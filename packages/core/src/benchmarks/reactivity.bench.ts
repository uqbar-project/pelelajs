import { afterAll, bench } from 'vitest'
import { DependencyTracker } from '../bindings/dependencyTracker'
import { setupBindings } from '../bindings/setupBindings'
import type { BindingsCollection, ContentBinding } from '../bindings/types'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'

const BINDING_COUNT = 100
const TRACKER_BINDING_COUNT = 1000
const INITIALIZATION_ELEMENT_COUNT = 200

function createContainer(markup: string): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = markup
  document.body.appendChild(container)
  return container
}

function createMarkup(pathFor: (index: number) => string, count: number): string {
  return Array.from(
    { length: count },
    (_, index) => `<span bind-content="${pathFor(index)}"></span>`,
  ).join('')
}

function createViewModel(count: number): Record<string, unknown> {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [`prop${index}`, `value-${index}`]),
  )
}

function setupPropagationScenario(markup: string, viewModel: Record<string, unknown>) {
  const container = createContainer(markup)
  let render: (changedPath?: string) => void = () => {}
  const reactiveViewModel = createReactiveViewModel(viewModel, (changedPath) => render(changedPath))
  render = setupBindings(container, reactiveViewModel)
  return { container, reactiveViewModel }
}

const flatScenario = setupPropagationScenario(
  createMarkup((index) => `prop${index}`, BINDING_COUNT),
  createViewModel(BINDING_COUNT),
)
const nestedScenario = setupPropagationScenario(
  createMarkup((index) => `items.${index}.value`, BINDING_COUNT),
  {
    items: Array.from({ length: BINDING_COUNT }, (_, index) => ({ value: `value-${index}` })),
  },
)
const nestedItems = nestedScenario.reactiveViewModel.items as Array<{ value: string }>

afterAll(() => {
  flatScenario.container.remove()
  nestedScenario.container.remove()
})

let flatVersion = 0
bench('propagation-flat', () => {
  flatVersion += 1
  flatScenario.reactiveViewModel.prop0 = `flat-${flatVersion}`
})

let nestedVersion = 0
bench('propagation-nested', () => {
  nestedVersion += 1
  nestedItems[0].value = `nested-${nestedVersion}`
})

function createBindingsCollection(contentBindings: ContentBinding[]): BindingsCollection {
  return {
    valueBindings: [],
    contentBindings,
    srcBindings: [],
    altBindings: [],
    enabledBindings: [],
    ifBindings: [],
    classBindings: [],
    styleBindings: [],
    forEachBindings: [],
    componentBindings: [],
  }
}

const trackerViewModel = {}
const tracker = new DependencyTracker()
const trackedBindings = createBindingsCollection(
  Array.from({ length: TRACKER_BINDING_COUNT }, (_, index) => ({
    element: document.createElement('span'),
    propertyName: `prop${index}`,
  })),
)
trackedBindings.contentBindings.forEach((binding) => {
  tracker.registerDependency(binding, binding.propertyName, trackerViewModel)
})

bench('dependency-tracker-lookup', () => {
  tracker.getDependentBindingsWithGetterSupport('prop500', trackedBindings)
})

const initializationMarkup = createMarkup((index) => `prop${index}`, INITIALIZATION_ELEMENT_COUNT)

bench('setup-bindings-init', () => {
  const container = createContainer(initializationMarkup)
  setupBindings(container, createViewModel(INITIALIZATION_ELEMENT_COUNT))
  container.remove()
})
