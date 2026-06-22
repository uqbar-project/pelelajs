import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidHandlerError } from '../errors/index'
import { testHelpers } from '../test/helpers'
import { setupEnterBindings } from './bindEnter'

function createKeydownEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true })
}

describe('bindEnter', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    testHelpers.cleanupTestContainer(container)
  })

  describe('setupEnterBindings', () => {
    it('should call handler when Enter is pressed on input', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      const handleEnter = vi.fn()
      const viewModel = { handleEnter }

      setupEnterBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.dispatchEvent(createKeydownEvent('Enter'))

      expect(handleEnter).toHaveBeenCalledTimes(1)
    })

    it('should NOT call handler for non-Enter keys', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      const handleEnter = vi.fn()
      const viewModel = { handleEnter }

      setupEnterBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.dispatchEvent(createKeydownEvent('Space'))
      input.dispatchEvent(createKeydownEvent('Escape'))
      input.dispatchEvent(createKeydownEvent('Tab'))

      expect(handleEnter).not.toHaveBeenCalled()
    })

    it('should pass viewModel and event to handler', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      const handleEnter = vi.fn()
      const viewModel = { handleEnter }

      setupEnterBindings(container, viewModel)

      const input = container.querySelector('input')!
      const event = createKeydownEvent('Enter')
      input.dispatchEvent(event)

      expect(handleEnter).toHaveBeenCalledWith(viewModel, event)
    })

    it('should execute handler in viewModel context', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      let context: unknown = null
      const viewModel = {
        value: 42,
        handleEnter: function (this: unknown) {
          context = this
        },
      }

      setupEnterBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.dispatchEvent(createKeydownEvent('Enter'))

      expect(context).toBe(viewModel)
      expect((context as Record<string, unknown>).value).toBe(42)
    })

    it('should handle multiple inputs with enter', () => {
      container.innerHTML = `
        <input enter="handler1" />
        <input enter="handler2" />
      `
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const viewModel = { handler1, handler2 }

      setupEnterBindings(container, viewModel)

      const inputs = container.querySelectorAll('input')
      inputs[0].dispatchEvent(createKeydownEvent('Enter'))
      inputs[1].dispatchEvent(createKeydownEvent('Enter'))

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should allow handler to modify viewModel', () => {
      container.innerHTML = '<input enter="increment" />'
      const viewModel = {
        count: 0,
        increment: function () {
          this.count++
        },
      }

      setupEnterBindings(container, viewModel)

      const input = container.querySelector('input')!
      input.dispatchEvent(createKeydownEvent('Enter'))
      input.dispatchEvent(createKeydownEvent('Enter'))
      input.dispatchEvent(createKeydownEvent('Enter'))

      expect(viewModel.count).toBe(3)
    })

    it('should handle elements without enter attribute', () => {
      container.innerHTML = `
        <input placeholder="No handler" />
        <input enter="" placeholder="Empty" />
      `
      const viewModel = {}

      expect(() => {
        setupEnterBindings(container, viewModel)
      }).not.toThrow()
    })

    it('should throw InvalidHandlerError when handler is not a function', () => {
      container.innerHTML = '<input enter="notAFunction" />'
      const viewModel = { notAFunction: 'this is a string' }
      const input = container.querySelector('input')!

      const addEventListenerSpy = vi.spyOn(input, 'addEventListener')
      setupEnterBindings(container, viewModel)

      const keydownListener = addEventListenerSpy.mock.calls[0][1] as EventListener
      const mockEvent = createKeydownEvent('Enter')

      expect(() => keydownListener(mockEvent)).toThrow(InvalidHandlerError)
    })

    it('should throw InvalidHandlerError with correct parameters when handler is not a function', () => {
      container.innerHTML = '<input enter="invalidHandler" />'
      class TestViewModel {
        [key: string]: unknown
        invalidHandler = 42
      }
      const viewModel = new TestViewModel()
      const input = container.querySelector('input')!

      const addEventListenerSpy = vi.spyOn(input, 'addEventListener')
      setupEnterBindings(container, viewModel)

      const keydownListener = addEventListenerSpy.mock.calls[0][1] as EventListener
      const mockEvent = createKeydownEvent('Enter')

      expect(() => keydownListener(mockEvent)).toThrow(
        new InvalidHandlerError('invalidHandler', 'TestViewModel', 'enter'),
      )
    })

    it('should throw InvalidHandlerError when handler is undefined', () => {
      container.innerHTML = '<input enter="nonExistentHandler" />'
      const viewModel = {}
      const input = container.querySelector('input')!

      const addEventListenerSpy = vi.spyOn(input, 'addEventListener')
      setupEnterBindings(container, viewModel)

      const keydownListener = addEventListenerSpy.mock.calls[0][1] as EventListener
      const mockEvent = createKeydownEvent('Enter')

      expect(() => keydownListener(mockEvent)).toThrow(InvalidHandlerError)
    })

    it('should throw InvalidHandlerError when handler is null', () => {
      container.innerHTML = '<input enter="nullHandler" />'
      const viewModel = { nullHandler: null }
      const input = container.querySelector('input')!

      const addEventListenerSpy = vi.spyOn(input, 'addEventListener')
      setupEnterBindings(container, viewModel)

      const keydownListener = addEventListenerSpy.mock.calls[0][1] as EventListener
      const mockEvent = createKeydownEvent('Enter')

      expect(() => keydownListener(mockEvent)).toThrow(InvalidHandlerError)
    })

    it('should setup event listener even if the root element itself has the enter attribute', () => {
      const input = document.createElement('input')
      input.setAttribute('enter', 'handleEnter')
      const handleEnter = vi.fn()
      const viewModel = { handleEnter }

      setupEnterBindings(input, viewModel)
      input.dispatchEvent(createKeydownEvent('Enter'))

      expect(handleEnter).toHaveBeenCalledTimes(1)
    })

    it('should throw error when enter is on a non-input element', () => {
      container.innerHTML = '<div enter="handleEnter"></div>'
      const viewModel = { handleEnter: vi.fn() }

      expect(() => {
        setupEnterBindings(container, viewModel)
      }).toThrow(/enter can only be used on <input> elements/)
    })

    it('should throw error when enter is on textarea, button, or select', () => {
      container.innerHTML = `
        <textarea enter="handleEnter"></textarea>
        <button enter="handleEnter">Button</button>
        <select enter="handleEnter"></select>
      `
      const viewModel = { handleEnter: vi.fn() }

      expect(() => {
        setupEnterBindings(container, viewModel)
      }).toThrow(/enter can only be used on <input> elements/)
    })
  })
})
