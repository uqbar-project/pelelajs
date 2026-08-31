import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '../commons/i18n'
import { InvalidHandlerError } from '../errors/index'
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

    it('should render the error page when the handler throws', () => {
      container.innerHTML = '<input enter="handleEnter" />'
      const viewModel = {
        handleEnter: () => {
          throw new Error(HANDLER_ERROR_MESSAGE)
        },
      }

      setupEnterBindings(container, viewModel)

      container.querySelector('input')!.dispatchEvent(createKeydownEvent('Enter'))

      expect(document.querySelector(ERROR_MESSAGE_SELECTOR)?.textContent).toBe(
        HANDLER_ERROR_MESSAGE,
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

    it('should render InvalidHandlerError when handler is not a function', () => {
      container.innerHTML = '<input enter="notAFunction" />'
      const viewModel = { notAFunction: 'this is a string' }
      const input = container.querySelector('input')!
      setupEnterBindings(container, viewModel)

      input.dispatchEvent(createKeydownEvent('Enter'))

      const expectedError = new InvalidHandlerError('notAFunction', 'Object', 'enter')
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

      expect(() => {
        setupEnterBindings(container, viewModel)
      }).toThrow(t('errors.compiler.enterOnlyForInput', { tag: 'div' }))
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
      }).toThrow(t('errors.compiler.enterOnlyForInput', { tag: 'textarea' }))
    })
  })
})
