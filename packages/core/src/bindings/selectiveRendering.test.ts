import { beforeEach, describe, expect, it } from 'vitest'
import { createReactiveViewModel } from '../reactivity/reactiveProxy'
import { setupBindings } from './setupBindings'

describe('Selective Rendering Performance', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('should only re-render bindings affected by changed property', () => {
    container.innerHTML = `
      <span bind-content="name"></span>
      <span bind-content="email"></span>
      <span bind-content="age"></span>
      <div if="isActive"></div>
      <div bind-class="classes"></div>
    `

    const viewModel = {
      name: 'John',
      email: 'john@example.com',
      age: 30,
      isActive: true,
      classes: 'user',
    }

    let renderCount = 0
    const reactiveViewModel = createReactiveViewModel(viewModel, (changedPath) => {
      renderCount++
      render(changedPath)
    })

    const render = setupBindings(container, reactiveViewModel)

    const initialRenderCount = renderCount

    reactiveViewModel.name = 'Jane'

    expect(renderCount).toBe(initialRenderCount + 1)
  })

  it('should render all bindings on initial setup', () => {
    container.innerHTML = `
      <span bind-content="value1"></span>
      <span bind-content="value2"></span>
      <span bind-content="value3"></span>
    `

    const viewModel = {
      value1: 'a',
      value2: 'b',
      value3: 'c',
    }

    setupBindings(container, viewModel)

    const spans = container.querySelectorAll('span')
    expect(spans[0].textContent).toBe('a')
    expect(spans[1].textContent).toBe('b')
    expect(spans[2].textContent).toBe('c')
  })

  it('should support render without changedPath for backward compatibility', () => {
    container.innerHTML = `
      <span bind-content="message"></span>
      <div if="show"></div>
    `

    const viewModel = {
      message: 'Hello',
      show: true,
    }

    const render = setupBindings(container, viewModel)

    viewModel.message = 'World'
    viewModel.show = false

    render()

    expect(container.querySelector('span')!.textContent).toBe('World')
    expect(container.querySelector('div')!.style.display).toBe('none')
  })

  it('should handle nested property changes efficiently', () => {
    container.innerHTML = `
      <span bind-content="user.name"></span>
      <span bind-content="user.email"></span>
      <span bind-content="other"></span>
    `

    const viewModel = {
      user: {
        name: 'John',
        email: 'john@example.com',
      },
      other: 'data',
    }

    let renderCount = 0
    const reactiveViewModel = createReactiveViewModel(viewModel, (changedPath) => {
      renderCount++
      render(changedPath)
    })

    const render = setupBindings(container, reactiveViewModel)

    renderCount = 0

    reactiveViewModel.user.name = 'Jane'

    expect(renderCount).toBe(1)
    expect(container.querySelectorAll('span')[0].textContent).toBe('Jane')
  })

  it('should handle for-each changes efficiently', () => {
    container.innerHTML = `
      <div for-each="item of items">
        <span bind-content="item"></span>
      </div>
      <span bind-content="other"></span>
    `

    const viewModel = {
      items: ['a', 'b', 'c'],
      other: 'data',
    }

    let renderCount = 0
    const reactiveViewModel = createReactiveViewModel(viewModel, (changedPath) => {
      renderCount++
      render(changedPath)
    })

    const render = setupBindings(container, reactiveViewModel)

    renderCount = 0

    reactiveViewModel.items.push('d')

    expect(renderCount).toBeGreaterThan(0)
    expect(renderCount).toBeLessThan(10)
  })

  it('should demonstrate performance improvement with many bindings', () => {
    const bindingsHtml: string[] = []
    for (let i = 0; i < 50; i++) {
      bindingsHtml.push(`<span bind-content="prop${i}"></span>`)
    }
    container.innerHTML = bindingsHtml.join('')

    const viewModel: any = {}
    for (let i = 0; i < 50; i++) {
      viewModel[`prop${i}`] = `value${i}`
    }

    let renderCount = 0
    const reactiveViewModel = createReactiveViewModel(viewModel, (changedPath) => {
      renderCount++
      render(changedPath)
    })

    const render = setupBindings(container, reactiveViewModel)

    renderCount = 0

    reactiveViewModel.prop0 = 'changed'

    expect(renderCount).toBe(1)

    const firstSpan = container.querySelector('span')
    expect(firstSpan!.textContent).toBe('changed')
  })
})
