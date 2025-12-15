import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testHelpers } from '../test/helpers'
import { setupBindings } from './setupBindings'

describe('setupBindings', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  it('should setup all binding types', () => {
    container.innerHTML = `
      <input bind-value="message" />
      <div if="show"></div>
      <div bind-class="classes"></div>
      <div bind-style="styles"></div>
      <button click="handleClick">Click</button>
    `

    const viewModel = {
      message: 'Hello',
      show: true,
      classes: 'test',
      styles: { color: 'red' },
      handleClick: vi.fn(),
    }

    const render = setupBindings(container, viewModel)

    expect(typeof render).toBe('function')
  })

  it('should perform initial render automatically', () => {
    container.innerHTML = '<span bind-content="message"></span>'
    const viewModel = { message: 'Initial' }

    setupBindings(container, viewModel)

    const span = container.querySelector('span')!
    expect(span.innerHTML).toBe('Initial')
  })

  it('should return render function that updates all bindings', () => {
    container.innerHTML = `
      <span bind-content="count"></span>
      <div if="show"></div>
    `

    const viewModel = {
      count: 0,
      show: false,
    }

    const render = setupBindings(container, viewModel)

    viewModel.count = 42
    viewModel.show = true
    render()

    expect(container.querySelector('span')!.innerHTML).toBe('42')
    expect(container.querySelector('div')!.style.display).not.toBe('none')
  })

  it('should handle multiple elements of same binding type', () => {
    container.innerHTML = `
      <span bind-content="value1"></span>
      <span bind-content="value2"></span>
      <span bind-content="value3"></span>
    `

    const viewModel = {
      value1: 'one',
      value2: 'two',
      value3: 'three',
    }

    setupBindings(container, viewModel)

    const spans = container.querySelectorAll('span')
    expect(spans[0].innerHTML).toBe('one')
    expect(spans[1].innerHTML).toBe('two')
    expect(spans[2].innerHTML).toBe('three')
  })

  it('should setup event listeners for click', () => {
    container.innerHTML = '<button click="handleClick">Click</button>'
    const handleClick = vi.fn()
    const viewModel = { handleClick }

    setupBindings(container, viewModel)

    container.querySelector('button')!.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should only update necessary elements on each render', () => {
    container.innerHTML = `
      <span bind-content="changing"></span>
      <span bind-content="static"></span>
    `

    const viewModel = {
      changing: 'initial',
      static: 'never changes',
    }

    const render = setupBindings(container, viewModel)

    viewModel.changing = 'updated'
    render()

    const spans = container.querySelectorAll('span')
    expect(spans[0].innerHTML).toBe('updated')
    expect(spans[1].innerHTML).toBe('never changes')
  })

  it('should handle empty element without error', () => {
    container.innerHTML = ''
    const viewModel = {}

    expect(() => {
      setupBindings(container, viewModel)
    }).not.toThrow()
  })

  it('should integrate all binding types correctly', () => {
    container.innerHTML = `
      <div>
        <input bind-value="name" />
        <div if="showMessage">
          <span bind-content="message" bind-class="messageClass" bind-style="messageStyle"></span>
        </div>
        <button click="submit">Submit</button>
      </div>
    `

    const submit = vi.fn()
    const viewModel = {
      name: 'John',
      showMessage: true,
      message: 'Hello',
      messageClass: 'highlight',
      messageStyle: { color: 'blue' },
      submit,
    }

    const render = setupBindings(container, viewModel)

    expect(container.querySelector('input')!.value).toBe('John')
    expect(container.querySelector('span')!.innerHTML).toBe('Hello')
    expect(container.querySelector('span')!.className).toContain('highlight')
    expect(container.querySelector('span')!.style.color).toBe('blue')

    viewModel.showMessage = false
    render()
    expect(container.querySelectorAll('div')[1].style.display).toBe('none')

    container.querySelector('button')!.click()
    expect(submit).toHaveBeenCalled()
  })
})
