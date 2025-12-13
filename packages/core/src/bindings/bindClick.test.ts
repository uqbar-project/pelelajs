import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidHandlerError } from '../errors/index'
import { testHelpers } from '../test/helpers'
import { setupClickBindings } from './bindClick'

describe('bindClick', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  describe('setupClickBindings', () => {
    it('should setup event listeners on elements with click', () => {
      container.innerHTML = '<button click="handleClick">Click me</button>'
      const handleClick = vi.fn()
      const viewModel = { handleClick }

      setupClickBindings(container, viewModel)

      const button = container.querySelector('button')!
      button.click()

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should pass event to handler', () => {
      container.innerHTML = '<button click="handleClick">Click me</button>'
      const handleClick = vi.fn()
      const viewModel = { handleClick }

      setupClickBindings(container, viewModel)

      const button = container.querySelector('button')!
      button.click()

      expect(handleClick).toHaveBeenCalledWith(expect.any(MouseEvent))
    })

    it('should execute handler in viewModel context', () => {
      container.innerHTML = '<button click="handleClick">Click me</button>'
      let context: any = null
      const viewModel = {
        value: 42,
        handleClick: function () {
          context = this
        },
      }

      setupClickBindings(container, viewModel)

      const button = container.querySelector('button')!
      button.click()

      expect(context).toBe(viewModel)
      expect(context.value).toBe(42)
    })

    it('should handle multiple elements with click', () => {
      container.innerHTML = `
        <button click="handler1">Button 1</button>
        <button click="handler2">Button 2</button>
      `
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const viewModel = { handler1, handler2 }

      setupClickBindings(container, viewModel)

      const buttons = container.querySelectorAll('button')
      buttons[0].click()
      buttons[1].click()

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should allow handler to modify viewModel', () => {
      container.innerHTML = '<button click="increment">Increment</button>'
      const viewModel = {
        count: 0,
        increment: function () {
          this.count++
        },
      }

      setupClickBindings(container, viewModel)

      const button = container.querySelector('button')!
      button.click()
      button.click()
      button.click()

      expect(viewModel.count).toBe(3)
    })

    it('should handle elements without click attribute', () => {
      container.innerHTML = `
        <button>No handler</button>
        <button click="">Empty</button>
      `
      const viewModel = {}

      expect(() => {
        setupClickBindings(container, viewModel)
      }).not.toThrow()
    })

    it('should work with different element types', () => {
      container.innerHTML = `
        <button click="handler">Button</button>
        <div click="handler">Div</div>
        <span click="handler">Span</span>
      `
      const handler = vi.fn()
      const viewModel = { handler }

      setupClickBindings(container, viewModel)

      container.querySelectorAll('[click]').forEach((el) => {
        ;(el as HTMLElement).click()
      })

      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('should throw InvalidHandlerError when handler is not a function', () => {
      container.innerHTML = '<button click="notAFunction">Click me</button>'
      const viewModel = { notAFunction: 'this is a string' }
      const button = container.querySelector('button')!

      const addEventListenerSpy = vi.spyOn(button, 'addEventListener')
      setupClickBindings(container, viewModel)

      const clickListener = addEventListenerSpy.mock.calls[0][1] as EventListener
      const mockEvent = new MouseEvent('click')

      expect(() => clickListener(mockEvent)).toThrow(InvalidHandlerError)
    })

    it('should throw InvalidHandlerError with correct parameters when handler is not a function', () => {
      container.innerHTML = '<button click="invalidHandler">Click me</button>'
      class TestViewModel {
        [key: string]: unknown
        invalidHandler = 42
      }
      const viewModel = new TestViewModel()
      const button = container.querySelector('button')!

      const addEventListenerSpy = vi.spyOn(button, 'addEventListener')
      setupClickBindings(container, viewModel)

      const clickListener = addEventListenerSpy.mock.calls[0][1] as EventListener
      const mockEvent = new MouseEvent('click')

      expect(() => clickListener(mockEvent)).toThrow(
        new InvalidHandlerError('invalidHandler', 'TestViewModel', 'click'),
      )
    })

    it('should throw InvalidHandlerError when handler is undefined', () => {
      container.innerHTML = '<button click="nonExistentHandler">Click me</button>'
      const viewModel = {}
      const button = container.querySelector('button')!

      const addEventListenerSpy = vi.spyOn(button, 'addEventListener')
      setupClickBindings(container, viewModel)

      const clickListener = addEventListenerSpy.mock.calls[0][1] as EventListener
      const mockEvent = new MouseEvent('click')

      expect(() => clickListener(mockEvent)).toThrow(InvalidHandlerError)
    })

    it('should throw InvalidHandlerError when handler is null', () => {
      container.innerHTML = '<button click="nullHandler">Click me</button>'
      const viewModel = { nullHandler: null }
      const button = container.querySelector('button')!

      const addEventListenerSpy = vi.spyOn(button, 'addEventListener')
      setupClickBindings(container, viewModel)

      const clickListener = addEventListenerSpy.mock.calls[0][1] as EventListener
      const mockEvent = new MouseEvent('click')

      expect(() => clickListener(mockEvent)).toThrow(InvalidHandlerError)
    })
  })
})
