import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setDebug } from '../commons/debugState'
import { t } from '../commons/i18n'
import {
  ArrowFunctionAsHandlerError,
  GetterAsHandlerError,
  PropertyAsHandlerError,
  WrongElementForBindingError,
} from '../errors/index'
import { testHelpers } from '../test/helpers'
import { setupEnterBindings } from './bindEnter'

const ERROR_MESSAGE_SELECTOR = '.error-message'
const HANDLER_ERROR_MESSAGE = 'Handler failed'

function createKeydownEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true })
}

describe('bindEnter', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = testHelpers.createTestContainer()
  })

  afterEach(() => {
    setDebug(false)
    vi.restoreAllMocks()
    testHelpers.cleanupAllContainers()
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

    it('should use the current global debug state when dispatching events', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      const handleEnter = vi.fn()
      const viewModel = { handleEnter }
      const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})

      setupEnterBindings(container, viewModel)

      const input = container.querySelector('input')!
      setDebug(true)
      input.dispatchEvent(createKeydownEvent('Enter'))
      expect(groupSpy).toHaveBeenCalledTimes(1)

      setDebug(false)
      input.dispatchEvent(createKeydownEvent('Enter'))
      expect(groupSpy).toHaveBeenCalledTimes(1)
      expect(handleEnter).toHaveBeenCalledTimes(2)
    })

    it('should disable registration and event logs when debug is explicitly false', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      const handleEnter = vi.fn()
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})

      setDebug(true)
      setupEnterBindings(container, { handleEnter }, { debug: false })
      container.querySelector('input')!.dispatchEvent(createKeydownEvent('Enter'))

      expect(logSpy).not.toHaveBeenCalled()
      expect(groupSpy).not.toHaveBeenCalled()
      expect(handleEnter).toHaveBeenCalledOnce()
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

    it('should render the error page when the handler throws', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      const viewModel = {
        handleEnter: function handleEnter() {
          throw new Error(HANDLER_ERROR_MESSAGE)
        },
      }

      setupEnterBindings(container, viewModel)

      container.querySelector('input')!.dispatchEvent(createKeydownEvent('Enter'))

      expect(document.querySelector(ERROR_MESSAGE_SELECTOR)?.textContent).toBe(
        HANDLER_ERROR_MESSAGE,
      )
    })

    it('should render an arrow function error page when the handler is an arrow function field of the view model class', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      class ViewModel {
        [key: string]: unknown
        handleEnter = () => {}
      }
      const viewModel = new ViewModel()

      setupEnterBindings(container, viewModel)

      container.querySelector('input')!.dispatchEvent(createKeydownEvent('Enter'))

      const expectedError = new ArrowFunctionAsHandlerError('handleEnter', 'ViewModel', 'enter')
      expect(document.querySelector(ERROR_MESSAGE_SELECTOR)?.textContent).toBe(
        expectedError.message,
      )
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

    it('should render PropertyAsHandlerError when a property is used as a method', () => {
      container.innerHTML = '<input enter="notAFunction" />'
      const viewModel = { notAFunction: 'this is a string' }
      const input = container.querySelector('input')!
      setupEnterBindings(container, viewModel)

      input.dispatchEvent(createKeydownEvent('Enter'))

      const expectedError = new PropertyAsHandlerError('notAFunction', 'Object', 'enter')
      expect(document.querySelector(ERROR_MESSAGE_SELECTOR)?.textContent).toBe(
        expectedError.message,
      )
    })

    it('should render GetterAsHandlerError when the handler is a getter', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      const viewModel = {
        get handleEnter() {
          return 42
        },
      }

      setupEnterBindings(container, viewModel)

      container.querySelector('input')!.dispatchEvent(createKeydownEvent('Enter'))

      const expectedError = new GetterAsHandlerError('handleEnter', 'Object', 'enter')
      expect(document.querySelector(ERROR_MESSAGE_SELECTOR)?.textContent).toBe(
        expectedError.message,
      )
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

      const error = testHelpers.catchError<WrongElementForBindingError>(() => {
        setupEnterBindings(container, viewModel)
      })

      expect(error).toBeInstanceOf(WrongElementForBindingError)
      expect(error.attributeName).toBe('enter')
      expect(error.tagName).toBe('div')
      expect(error.message).toBe(
        t('errors.compiler.enterOnlyForInput', {
          attributeName: 'enter',
          tagName: 'div',
          snippet: '<div enter="handleEnter"></div>',
        }),
      )
    })

    it('should throw error when enter is on textarea, button, or select', () => {
      container.innerHTML = `
        <textarea enter="handleEnter"></textarea>
        <button enter="handleEnter">Button</button>
        <select enter="handleEnter"></select>
      `
      const viewModel = { handleEnter: vi.fn() }

      const error = testHelpers.catchError<WrongElementForBindingError>(() => {
        setupEnterBindings(container, viewModel)
      })

      expect(error).toBeInstanceOf(WrongElementForBindingError)
      expect(error.attributeName).toBe('enter')
      expect(error.tagName).toBe('textarea')
      expect(error.message).toBe(
        t('errors.compiler.enterOnlyForInput', {
          attributeName: 'enter',
          tagName: 'textarea',
          snippet: '<textarea enter="handleEnter"></textarea>',
        }),
      )
    })
  })
})
